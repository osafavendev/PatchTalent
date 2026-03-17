import io
import re
import threading
import unicodedata
from typing import Dict, Iterable, List, Set

from django.core.cache import cache
from django.db.models import Count, Max
from jobcore.models import CandidateProfile

from .models import Job, JobApplication, JobMatchResult
try:
    import numpy as np
except Exception:  # pragma: no cover
    np = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:  # pragma: no cover
    TfidfVectorizer = None
    cosine_similarity = None

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    PdfReader = None

try:
    from docx import Document
except Exception:  # pragma: no cover
    Document = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover
    SentenceTransformer = None

CANDIDATE_CONTEXT_CACHE_KEY = "candidate_match_context_v2:{user_id}"
CANDIDATE_CONTEXT_TTL_SECONDS = 15 * 60
WORD_VECTOR_MAX_FEATURES = 12000
CHAR_VECTOR_MAX_FEATURES = 10000
SEMANTIC_EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MATCH_ENGINE_VERSION = "minilm-v1"

SKILL_KEYWORDS = {
    "python", "django", "flask", "fastapi", "java", "spring", "kotlin", "go", "golang",
    "rust", "javascript", "typescript", "react", "nextjs", "vue", "angular", "node",
    "express", "nestjs", "php", "laravel", "ruby", "rails", "c", "c++", "c#", ".net",
    "sql", "postgresql", "mysql", "sqlite", "mongodb", "redis", "elasticsearch",
    "graphql", "rest", "api", "microservices", "docker", "kubernetes", "aws", "gcp",
    "azure", "linux", "git", "ci/cd", "jenkins", "github actions", "terraform",
    "ansible", "pandas", "numpy", "scikit-learn", "machine learning", "nlp",
    "deep learning", "tensorflow", "pytorch", "llm", "data engineering", "spark",
    "hadoop", "airflow", "etl", "tableau", "power bi", "figma", "ui", "ux",
}
STOP_TOKENS = {
    "and", "the", "with", "for", "you", "your", "from", "that", "this", "are", "our",
    "have", "has", "will", "not", "job", "role", "work", "team", "experience", "years",
}

_CORPUS_LOCK = threading.Lock()
_CORPUS_CACHE = {"fingerprint": None, "bundle": None}
_MODEL_LOCK = threading.Lock()
_MODEL_CACHE = {"model": None, "failed": False}


def get_match_engine_version() -> str:
    return MATCH_ENGINE_VERSION


def _normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text or "")
    normalized = normalized.lower()
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _tokenize(text: str) -> List[str]:
    raw_tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#./-]{1,}", _normalize_text(text))
    return [token for token in raw_tokens if token not in STOP_TOKENS]


def _extract_skills(text: str) -> Set[str]:
    normalized = _normalize_text(text)
    found = set()
    for skill in SKILL_KEYWORDS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, normalized):
            found.add(skill)
    return found


def _extract_pdf_text(raw_bytes: bytes) -> str:
    if PdfReader is None:
        return ""
    try:
        reader = PdfReader(io.BytesIO(raw_bytes))
        return " ".join((page.extract_text() or "") for page in reader.pages[:12]).strip()
    except Exception:
        return ""


def _extract_docx_text(raw_bytes: bytes) -> str:
    if Document is None:
        return ""
    try:
        doc = Document(io.BytesIO(raw_bytes))
        return " ".join(paragraph.text for paragraph in doc.paragraphs).strip()
    except Exception:
        return ""


def _extract_text_from_cv_file(cv_file) -> str:
    if not cv_file:
        return ""
    try:
        cv_file.open("rb")
        raw_bytes = cv_file.read(4 * 1024 * 1024)
    except Exception:
        return ""
    finally:
        try:
            cv_file.close()
        except Exception:
            pass

    filename = (getattr(cv_file, "name", "") or "").lower()
    if filename.endswith(".pdf"):
        return _extract_pdf_text(raw_bytes)
    if filename.endswith(".docx"):
        return _extract_docx_text(raw_bytes)
    try:
        return raw_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _collect_candidate_payload(user):
    parts: List[str] = []
    location = ""
    headline = ""

    profile = (
        CandidateProfile.objects.filter(user=user)
        .prefetch_related("experiences", "projects")
        .first()
    )
    if profile:
        headline = profile.headline or ""
        location = profile.location or ""
        if profile.headline:
            parts.extend([profile.headline] * 4)
        if profile.about:
            parts.extend([profile.about] * 2)
        if profile.location:
            parts.append(profile.location)
        parts.append(_extract_text_from_cv_file(profile.cv))
        for experience in profile.experiences.all():
            if experience.title:
                parts.extend([experience.title] * 3)
            if experience.company:
                parts.append(experience.company)
            if experience.description:
                parts.extend([experience.description] * 2)
        for project in profile.projects.all():
            if project.name:
                parts.extend([project.name] * 2)
            if project.description:
                parts.append(project.description)

    recent_applications = (
        JobApplication.objects.filter(applicant=user)
        .order_by("-created_at")[:5]
    )
    for application in recent_applications:
        if application.cover_letter:
            parts.append(application.cover_letter)
        parts.append(_extract_text_from_cv_file(application.cv))

    candidate_text = " ".join(part for part in parts if part).strip()
    return {
        "text": candidate_text,
        "skills": list(_extract_skills(candidate_text)),
        "location": _normalize_text(location),
        "headline": headline,
    }


def _build_job_text_from_row(row) -> str:
    title = row.get("title") or ""
    description = row.get("description") or ""
    job_type = row.get("job_type") or ""
    job_location = row.get("job_location") or ""
    return " ".join([title, title, title, description, description, job_type, job_location]).strip()


def _build_job_text(job) -> str:
    return _build_job_text_from_row(
        {
            "title": job.title,
            "description": job.description,
            "job_type": job.job_type,
            "job_location": job.job_location,
        }
    )


def _job_corpus_fingerprint() -> str:
    summary = Job.objects.aggregate(total=Count("id"), max_updated=Max("updated_at"))
    total = summary.get("total") or 0
    max_updated = summary.get("max_updated")
    if not total:
        return "0:none"
    return f"{total}:{max_updated.isoformat() if max_updated else 'none'}"


def _build_job_corpus_bundle():
    job_rows = list(
        Job.objects.values("id", "title", "description", "job_type", "job_location").order_by("id")
    )
    if not job_rows:
        return None

    job_ids = [row["id"] for row in job_rows]
    job_docs = [_build_job_text_from_row(row) for row in job_rows]
    dense_embeddings = _encode_dense_embeddings(job_docs)
    job_meta = {
        row["id"]: {
            "skills": _extract_skills(" ".join([row.get("title") or "", row.get("description") or ""])),
            "location": _normalize_text(row.get("job_location") or ""),
            "job_type": (row.get("job_type") or "").lower(),
            "title_tokens": set(_tokenize(row.get("title") or "")),
        }
        for row in job_rows
    }

    if TfidfVectorizer is None or cosine_similarity is None:
        return {
            "job_ids": job_ids,
            "id_to_index": {job_id: idx for idx, job_id in enumerate(job_ids)},
            "word_vectorizer": None,
            "word_matrix": None,
            "char_vectorizer": None,
            "char_matrix": None,
            "dense_embeddings": dense_embeddings,
            "job_meta": job_meta,
        }

    word_vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=WORD_VECTOR_MAX_FEATURES,
        sublinear_tf=True,
    )
    char_vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=CHAR_VECTOR_MAX_FEATURES,
        sublinear_tf=True,
    )
    word_matrix = word_vectorizer.fit_transform(job_docs)
    char_matrix = char_vectorizer.fit_transform(job_docs)

    return {
        "job_ids": job_ids,
        "id_to_index": {job_id: idx for idx, job_id in enumerate(job_ids)},
        "word_vectorizer": word_vectorizer,
        "word_matrix": word_matrix,
        "char_vectorizer": char_vectorizer,
        "char_matrix": char_matrix,
        "dense_embeddings": dense_embeddings,
        "job_meta": job_meta,
    }


def _get_job_corpus_bundle(force_refresh=False):
    fingerprint = _job_corpus_fingerprint()
    with _CORPUS_LOCK:
        cached_fingerprint = _CORPUS_CACHE["fingerprint"]
        cached_bundle = _CORPUS_CACHE["bundle"]
        if not force_refresh and cached_bundle is not None and cached_fingerprint == fingerprint:
            return cached_bundle

    bundle = _build_job_corpus_bundle()
    with _CORPUS_LOCK:
        _CORPUS_CACHE["fingerprint"] = fingerprint
        _CORPUS_CACHE["bundle"] = bundle
    return bundle


def _get_embedding_model():
    if SentenceTransformer is None:
        return None
    with _MODEL_LOCK:
        cached_model = _MODEL_CACHE.get("model")
        if cached_model is not None:
            return cached_model
        if _MODEL_CACHE.get("failed"):
            return None
        try:
            model = SentenceTransformer(SEMANTIC_EMBEDDING_MODEL_NAME)
        except Exception:
            _MODEL_CACHE["failed"] = True
            return None
        _MODEL_CACHE["model"] = model
        return model


def _encode_dense_embeddings(texts: List[str]):
    if not texts or np is None:
        return None
    model = _get_embedding_model()
    if model is None:
        return None
    try:
        embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
            batch_size=64,
        )
    except Exception:
        return None
    if embeddings is None or len(embeddings) != len(texts):
        return None
    return embeddings


def _dense_semantic_score(candidate_text: str, bundle, job_index: int):
    dense_embeddings = bundle.get("dense_embeddings")
    if dense_embeddings is None or np is None:
        return None
    candidate_embeddings = _encode_dense_embeddings([candidate_text])
    if candidate_embeddings is None:
        return None
    try:
        score = float(np.dot(candidate_embeddings[0], dense_embeddings[job_index]))
    except Exception:
        return None
    return max(0.0, min(1.0, score))


def get_candidate_context_text(user) -> str:
    payload = get_candidate_context_payload(user)
    return payload.get("text") or ""


def get_candidate_context_payload(user):
    cache_key = CANDIDATE_CONTEXT_CACHE_KEY.format(user_id=user.id)
    cached_payload = cache.get(cache_key)
    if cached_payload is not None:
        return cached_payload

    payload = _collect_candidate_payload(user)
    cache.set(cache_key, payload, CANDIDATE_CONTEXT_TTL_SECONDS)
    return payload


def invalidate_candidate_match_cache(user_id: int) -> None:
    cache.delete(CANDIDATE_CONTEXT_CACHE_KEY.format(user_id=user_id))
    JobMatchResult.objects.filter(candidate_id=user_id).delete()


def _safe_cosine(row_vector, matrix_row) -> float:
    if cosine_similarity is None:
        return 0.0
    try:
        value = float(cosine_similarity(row_vector, matrix_row).flatten()[0])
    except Exception:
        return 0.0
    return max(0.0, min(1.0, value))


def _skill_overlap_score(candidate_skills: Set[str], job_skills: Set[str]) -> float:
    if not candidate_skills or not job_skills:
        return 0.0
    overlap = candidate_skills.intersection(job_skills)
    if not overlap:
        return 0.0
    precision = len(overlap) / len(job_skills)
    recall = len(overlap) / len(candidate_skills)
    if precision + recall == 0:
        return 0.0
    return (2 * precision * recall) / (precision + recall)


def _title_overlap_score(candidate_payload, job_meta) -> float:
    candidate_tokens = set(_tokenize(candidate_payload.get("headline") or candidate_payload.get("text") or ""))
    title_tokens = job_meta.get("title_tokens") or set()
    if not candidate_tokens or not title_tokens:
        return 0.0
    overlap = candidate_tokens.intersection(title_tokens)
    return len(overlap) / len(title_tokens)


def _location_compatibility_score(candidate_payload, job_meta) -> float:
    job_type = (job_meta.get("job_type") or "").lower()
    if job_type == Job.REMOTE:
        return 1.0
    candidate_location = candidate_payload.get("location") or ""
    job_location = job_meta.get("location") or ""
    if not candidate_location or not job_location:
        return 0.35
    if candidate_location in job_location or job_location in candidate_location:
        return 1.0
    candidate_tokens = set(_tokenize(candidate_location))
    job_tokens = set(_tokenize(job_location))
    if candidate_tokens.intersection(job_tokens):
        return 0.65
    return 0.2


def _fallback_pairwise_similarity(candidate_text: str, job_text: str) -> float:
    if TfidfVectorizer is None or cosine_similarity is None:
        return 0.0
    if not candidate_text or not job_text:
        return 0.0
    try:
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=5000)
        matrix = vectorizer.fit_transform([candidate_text, job_text])
        value = float(cosine_similarity(matrix[0:1], matrix[1:2]).flatten()[0])
    except Exception:
        return 0.0
    return max(0.0, min(1.0, value))


def match_job_for_candidate(user, job) -> float:
    candidate_payload = get_candidate_context_payload(user)
    candidate_text = candidate_payload.get("text") or ""
    if not candidate_text:
        return 0.0

    bundle = _get_job_corpus_bundle()
    if not bundle:
        return 0.0

    job_index = bundle["id_to_index"].get(job.id)
    if job_index is None:
        bundle = _get_job_corpus_bundle(force_refresh=True)
        if not bundle:
            return _fallback_pairwise_similarity(candidate_text, _build_job_text(job))
        job_index = bundle["id_to_index"].get(job.id)
        if job_index is None:
            return _fallback_pairwise_similarity(candidate_text, _build_job_text(job))

    word_vectorizer = bundle.get("word_vectorizer")
    char_vectorizer = bundle.get("char_vectorizer")
    word_matrix = bundle.get("word_matrix")
    char_matrix = bundle.get("char_matrix")
    job_meta = bundle.get("job_meta", {}).get(job.id, {})
    dense_score = _dense_semantic_score(candidate_text, bundle, job_index)

    if dense_score is None and (word_vectorizer is None or char_vectorizer is None):
        return round(_fallback_pairwise_similarity(candidate_text, _build_job_text(job)), 4)

    semantic_word = 0.0
    semantic_char = 0.0
    if word_vectorizer is not None and char_vectorizer is not None:
        word_candidate_vector = word_vectorizer.transform([candidate_text])
        char_candidate_vector = char_vectorizer.transform([candidate_text])
        semantic_word = _safe_cosine(word_candidate_vector, word_matrix[job_index : job_index + 1])
        semantic_char = _safe_cosine(char_candidate_vector, char_matrix[job_index : job_index + 1])

    candidate_skills = set(candidate_payload.get("skills") or [])
    skill_score = _skill_overlap_score(candidate_skills, job_meta.get("skills") or set())
    title_score = _title_overlap_score(candidate_payload, job_meta)
    location_score = _location_compatibility_score(candidate_payload, job_meta)

    if dense_score is None:
        score = (
            (0.52 * semantic_word)
            + (0.18 * semantic_char)
            + (0.18 * skill_score)
            + (0.07 * title_score)
            + (0.05 * location_score)
        )
        if semantic_word < 0.03 and skill_score == 0 and title_score == 0:
            score *= 0.65
    else:
        score = (
            (0.68 * dense_score)
            + (0.12 * semantic_word)
            + (0.08 * semantic_char)
            + (0.07 * skill_score)
            + (0.03 * title_score)
            + (0.02 * location_score)
        )
        if dense_score < 0.2 and skill_score == 0 and title_score == 0:
            score *= 0.7

    return round(max(0.0, min(1.0, score)), 4)

def _build_application_proposal_text(application) -> str:
    parts: List[str] = []
    if application.cover_letter:
        parts.extend([application.cover_letter] * 3)
    parts.append(_extract_text_from_cv_file(application.cv))
    return " ".join(part for part in parts if part).strip()


def _proposal_score_from_bundle(proposal_text: str, job, bundle) -> float:
    if not proposal_text:
        return 0.0

    job_index = bundle["id_to_index"].get(job.id)
    if job_index is None:
        bundle = _get_job_corpus_bundle(force_refresh=True)
        if not bundle:
            return _fallback_pairwise_similarity(proposal_text, _build_job_text(job))
        job_index = bundle["id_to_index"].get(job.id)
        if job_index is None:
            return _fallback_pairwise_similarity(proposal_text, _build_job_text(job))

    word_vectorizer = bundle.get("word_vectorizer")
    char_vectorizer = bundle.get("char_vectorizer")
    word_matrix = bundle.get("word_matrix")
    char_matrix = bundle.get("char_matrix")
    dense_score = _dense_semantic_score(proposal_text, bundle, job_index)
    job_meta = bundle.get("job_meta", {}).get(job.id, {})
    proposal_skills = _extract_skills(proposal_text)
    skill_score = _skill_overlap_score(proposal_skills, job_meta.get("skills") or set())

    semantic_word = 0.0
    semantic_char = 0.0
    if word_vectorizer is not None and char_vectorizer is not None:
        word_vector = word_vectorizer.transform([proposal_text])
        char_vector = char_vectorizer.transform([proposal_text])
        semantic_word = _safe_cosine(word_vector, word_matrix[job_index : job_index + 1])
        semantic_char = _safe_cosine(char_vector, char_matrix[job_index : job_index + 1])

    if dense_score is None:
        score = (
            (0.72 * semantic_word)
            + (0.16 * semantic_char)
            + (0.12 * skill_score)
        )
    else:
        score = (
            (0.78 * dense_score)
            + (0.12 * semantic_word)
            + (0.05 * semantic_char)
            + (0.05 * skill_score)
        )

    if skill_score == 0 and semantic_word < 0.03 and (dense_score is None or dense_score < 0.18):
        score *= 0.72

    return round(max(0.0, min(1.0, score)), 4)


def score_application_for_job(job, application, bundle=None) -> float:
    proposal_text = _build_application_proposal_text(application)
    if not proposal_text:
        return 0.0

    if bundle is None:
        bundle = _get_job_corpus_bundle()

    if not bundle:
        fallback_score = _fallback_pairwise_similarity(proposal_text, _build_job_text(job))
        return round(max(0.0, min(1.0, fallback_score)), 4)

    return _proposal_score_from_bundle(proposal_text, job, bundle)


def rank_applications_for_job(job, applications: Iterable) -> Dict[int, float]:
    applications = list(applications)
    if not applications:
        return {}

    bundle = _get_job_corpus_bundle()
    return {
        application.id: score_application_for_job(job, application, bundle=bundle)
        for application in applications
    }


def rank_jobs_for_candidate(user, jobs: Iterable) -> Dict[int, float]:
    jobs = list(jobs)
    if not jobs:
        return {}
    return {job.id: match_job_for_candidate(user, job) for job in jobs}
