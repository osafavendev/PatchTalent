# PatchTalent - Complete Technical Documentation

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Django-6.0-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</p>

<p align="center">
  <a href="https://github.com/osafavendev/PatchTalent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/Maintained-Yes-green.svg?style=flat-square" alt="Maintained">
  <img src="https://img.shields.io/badge/Made%20with-❤️-red.svg?style=flat-square" alt="Made with Love">
</p>

<p align="center">
  <b>A full-stack AI-powered hiring platform built with Django 6, Django REST Framework, Channels (WebSockets), Celery, PostgreSQL, React 19, and Vite.</b>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#development-setup">Installation</a> •
  <a href="#docker-deployment">Docker</a> •
  <a href="#api-endpoints">API</a> •
  <a href="#license">License</a>
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Backend Documentation](#backend-documentation)
   - [Django Apps](#django-apps)
   - [Models](#models)
   - [API Endpoints](#api-endpoints)
   - [Serializers](#serializers)
   - [WebSocket Consumers](#websocket-consumers)
   - [AI/ML Recommendation Engine](#aiml-recommendation-engine)
   - [Celery Tasks](#celery-tasks)
7. [Frontend Documentation](#frontend-documentation)
   - [React Components](#react-components)
   - [API Services](#api-services)
   - [State Management](#state-management)
   - [Routing](#routing)
8. [Database Schema](#database-schema)
9. [Authentication Flow](#authentication-flow)
10. [Real-time Chat System](#real-time-chat-system)
11. [Environment Configuration](#environment-configuration)
12. [Development Setup](#development-setup)
13. [Docker Deployment](#docker-deployment)
14. [Testing](#testing)
15. [Security Considerations](#security-considerations)
16. [License](#license)

---

## Overview

PatchTalent is a comprehensive hiring platform that connects HR professionals with job candidates. The platform features:

- **Two user roles**: HR users who create and manage jobs, and Candidates who apply and build profiles
- **AI-powered job matching**: Uses TF-IDF vectorization and optional sentence-transformers for semantic matching
- **Real-time messaging**: WebSocket-based chat between HR and candidates
- **Rich profile management**: Experiences, projects, CV uploads, and social links
- **Automated maintenance**: Celery tasks for scheduled job cleanup

---

## Features

### Authentication & Authorization
- Email/password registration with role selection (HR or Candidate)
- JWT-based authentication (access + refresh tokens)
- Custom user model with `is_hr` role flag
- Role-based access control across all API endpoints
- Automatic token refresh on 401 responses

### Job Management
- HR users can create, edit, delete, and list their jobs
- Rich Markdown job descriptions with live preview
- Job types: Remote, Hybrid, On-site
- Location validation based on job type
- Paginated job listings with search and filters

### Job Applications
- Candidates apply with cover letter and CV
- Cover letter validation (30-4000 characters)
- CV file validation (PDF, DOC, DOCX, TXT; max 10MB)
- Update existing applications
- HR can view and rank applicants by proposal quality

### AI/ML Match Scoring
- Candidate-to-job match scoring endpoint
- Multi-signal scoring: semantic similarity, skill overlap, title matching, location compatibility
- TF-IDF vectorization with word and character n-grams
- Optional dense embeddings via sentence-transformers (MiniLM)
- Match score caching with automatic invalidation on profile updates
- Proposal ranking for HR applicant review

### Profile Management
- **Candidate profiles**: Headline, about, location, social links (LinkedIn, GitHub, portfolio), CV upload
- **Experience management**: CRUD for work history with date validation
- **Project showcase**: CRUD with screenshots, live URLs, and repository links
- **Company profiles**: For HR users with company details

### Real-time Chat
- 1:1 conversations between HR and Candidates
- WebSocket-based messaging for instant delivery
- File attachments in chat messages
- Read receipts with "seen" timestamps
- Unread message counters
- Cross-tab notification synchronization
- Browser push notifications support

### Async Jobs & Maintenance
- Celery worker for background task processing
- Celery Beat for scheduled tasks
- Automatic deletion of jobs older than 30 days
- Daily scheduled cleanup at midnight UTC

---

## Tech Stack

### Backend

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-6.0-092E20?style=flat-square&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/DRF-3.16-ff1709?style=flat-square&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5.4-37814A?style=flat-square&logo=celery&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Channels-010101?style=flat-square&logo=socket.io&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.7-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)

| Technology | Version | Purpose |
|------------|---------|----------|
| Python | 3.12+ | Runtime |
| Django | 6.0.2 | Web framework |
| Django REST Framework | 3.16.1 | REST API |
| djangorestframework-simplejwt | 5.5.1 | JWT authentication |
| Channels | 4.3.2 | WebSocket support |
| Daphne | 4.2.1 | ASGI server |
| Celery | 5.4.0 | Task queue |
| Redis | 5.0.8 | Message broker & cache |
| PostgreSQL | 16 | Database |
| scikit-learn | 1.7.2 | TF-IDF vectorization |
| sentence-transformers | 3.4.1 | Semantic embeddings |
| pypdf | 6.1.1 | PDF text extraction |
| python-docx | 1.2.0 | DOCX text extraction |
| django-cors-headers | 4.7.0 | CORS handling |
| python-dotenv | 1.2.1 | Environment management |
| psycopg | 3.2.12 | PostgreSQL adapter |

### Frontend

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Axios](https://img.shields.io/badge/Axios-1.13-5A29E4?style=flat-square&logo=axios&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=react-router&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=flat-square&logo=framer&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-7-007FFF?style=flat-square&logo=mui&logoColor=white)

| Technology | Version | Purpose |
|------------|---------|----------|
| React | 19.2.0 | UI framework |
| Vite | 7.2.4 | Build tool |
| TailwindCSS | 3.4.19 | Styling |
| Framer Motion | 12.31.0 | Animations |
| Axios | 1.13.4 | HTTP client |
| React Router | 7.13.0 | Client-side routing |
| react-markdown | 10.1.0 | Markdown rendering |
| react-mde | 11.5.0 | Markdown editor |
| jwt-decode | 4.0.0 | JWT parsing |
| react-icons | 5.5.0 | Icon library |
| MUI | 7.3.8 | Component library |

### DevOps & Tools

![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-Ready-009639?style=flat-square&logo=nginx&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI/CD-Ready-2088FF?style=flat-square&logo=github-actions&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-Configured-4B32C3?style=flat-square&logo=eslint&logoColor=white)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    React 19 + Vite Frontend                          │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────┐ │   │
│  │  │ JobsDash  │  │  Profile  │  │   Chat    │  │  Auth (Login/Reg) │ │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────────────┘ │   │
│  │         │              │              │               │              │   │
│  │  ┌──────┴──────────────┴──────────────┴───────────────┴─────────┐   │   │
│  │  │                      API Services (Axios)                     │   │   │
│  │  │    auth.js  │  jobs.js  │  chat.js  │  profile.js            │   │   │
│  │  └───────────────────────────┬───────────────────────────────────┘   │   │
│  └──────────────────────────────┼───────────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
              HTTP REST API       │        WebSocket
              ─────────────       │        ─────────
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Django + Daphne)                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         ASGI Application                               │  │
│  │  ┌─────────────────────────┐    ┌─────────────────────────────────┐   │  │
│  │  │      HTTP Router        │    │      WebSocket Router            │   │  │
│  │  │   (Django REST API)     │    │   (Channels Consumers)           │   │  │
│  │  └───────────┬─────────────┘    └───────────────┬─────────────────┘   │  │
│  └──────────────┼──────────────────────────────────┼─────────────────────┘  │
│                 │                                  │                        │
│  ┌──────────────┼──────────────┐    ┌──────────────┼─────────────────────┐  │
│  │              ▼              │    │              ▼                     │  │
│  │  ┌───────────────────────┐  │    │  ┌─────────────────────────────┐   │  │
│  │  │   authentication/     │  │    │  │  UserNotificationsConsumer  │   │  │
│  │  │   - RegisterView      │  │    │  │  ConversationChatConsumer   │   │  │
│  │  │   - EmailLoginView    │  │    │  └─────────────────────────────┘   │  │
│  │  │   - CheckAuthView     │  │    │                                    │  │
│  │  └───────────────────────┘  │    │  Channel Layer: InMemoryChannel   │  │
│  │  ┌───────────────────────┐  │    │  (or Redis for production)        │  │
│  │  │       core/           │  │    └────────────────────────────────────┘  │
│  │  │   - JobCreateView     │  │                                            │
│  │  │   - JobListView       │  │    ┌────────────────────────────────────┐  │
│  │  │   - JobDetailView     │  │    │         Recommendation Engine      │  │
│  │  │   - JobApplyView      │  │    │  ┌──────────────────────────────┐  │  │
│  │  │   - JobMatchScoreView │◀─┼────┼──│  TF-IDF (word + char ngrams) │  │  │
│  │  │   - ConversationViews │  │    │  │  Sentence Transformers       │  │  │
│  │  └───────────────────────┘  │    │  │  Skill Extraction            │  │  │
│  │  ┌───────────────────────┐  │    │  │  Location Matching           │  │  │
│  │  │      jobcore/         │  │    │  └──────────────────────────────┘  │  │
│  │  │   - CandidateProfile  │  │    └────────────────────────────────────┘  │
│  │  │   - CompanyProfile    │  │                                            │
│  │  │   - Experiences       │  │                                            │
│  │  │   - Projects          │  │                                            │
│  │  └───────────────────────┘  │                                            │
│  └─────────────────────────────┘                                            │
│                 │                                                           │
│                 ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PostgreSQL Database                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────────┐ ┌───────────────────┐   │   │
│  │  │  User   │ │   Job   │ │ JobApplication │ │   Conversation    │   │   │
│  │  └─────────┘ └─────────┘ └────────────────┘ └───────────────────┘   │   │
│  │  ┌──────────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐   │   │
│  │  │ CandidateProfile │ │ Experience │ │  Project   │ │ChatMessage│   │   │
│  │  └──────────────────┘ └────────────┘ └────────────┘ └───────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKGROUND WORKERS                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                              Redis                                   │   │
│  │                   (Message Broker + Result Backend)                  │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                                 ▼                                    │   │
│  │  ┌───────────────────────┐  ┌───────────────────────┐               │   │
│  │  │     Celery Worker     │  │     Celery Beat       │               │   │
│  │  │  ───────────────────  │  │  ─────────────────    │               │   │
│  │  │  Processes async      │  │  Schedules periodic   │               │   │
│  │  │  tasks from queue     │  │  tasks (job cleanup)  │               │   │
│  │  └───────────────────────┘  └───────────────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
patchtalent/
├── authentication/              # User authentication app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── jwt.py                   # Custom JWT serializer with user data
│   ├── models.py                # Custom User model with is_hr flag
│   ├── serializers.py           # Registration serializer
│   ├── urls.py                  # Auth URL routes
│   └── views.py                 # Register, Login, CheckAuth views
│
├── core/                        # Main business logic app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── chat_events.py           # WebSocket broadcast utilities
│   ├── consumers.py             # WebSocket consumers for chat
│   ├── migrations/              # Database migrations
│   ├── models.py                # Job, Application, Conversation, Message models
│   ├── pagination.py            # Custom pagination for jobs
│   ├── permissions.py           # Custom DRF permissions
│   ├── recommendation.py        # AI/ML match scoring engine
│   ├── routing.py               # WebSocket URL routing
│   ├── serializers.py           # Job, Application, Chat serializers
│   ├── tasks.py                 # Celery background tasks
│   ├── tests.py                 # Unit tests
│   ├── urls.py                  # API URL routes
│   └── views.py                 # API views for jobs, applications, chat
│
├── jobcore/                     # Profile management app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── migrations/
│   ├── models.py                # CandidateProfile, CompanyProfile, Experience, Project
│   ├── serializers.py           # Profile serializers
│   ├── tests.py
│   ├── urls.py
│   └── views.py                 # Profile API views
│
├── patchtalent/                 # Django project configuration
│   ├── __init__.py
│   ├── asgi.py                  # ASGI configuration with Channels
│   ├── celery.py                # Celery application setup
│   ├── settings.py              # Django settings
│   ├── urls.py                  # Root URL configuration
│   └── wsgi.py                  # WSGI configuration
│
├── frontend/                    # React frontend application
│   ├── dist/                    # Production build output
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── api/                 # API service modules
│   │   │   ├── auth.js          # Authentication API
│   │   │   ├── chat.js          # Chat API
│   │   │   ├── jobs.js          # Jobs API
│   │   │   └── profile.js       # Profile API
│   │   ├── pages/               # React page components
│   │   │   ├── CandidateProfileDetailPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── JobDetailPage.jsx
│   │   │   ├── JobForm.jsx
│   │   │   ├── JobsDashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── Register.jsx
│   │   ├── App.jsx              # Main application component
│   │   ├── index.css            # Global styles
│   │   └── main.jsx             # React entry point
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── media/                       # User uploaded files
│   ├── applications/cvs/        # Application CVs
│   ├── chat/attachments/        # Chat attachments
│   └── profiles/cvs/            # Profile CVs
│
├── .env.example                 # Environment template
├── .gitignore
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Backend Docker image
├── manage.py                    # Django management script
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

---

## Backend Documentation

### Django Apps

#### 1. `authentication` - User Management

Handles user registration, login, and authentication state.

**Files:**
- `models.py` - Custom User model extending AbstractUser
- `views.py` - Registration, login, and auth check endpoints
- `serializers.py` - User registration validation
- `jwt.py` - Custom JWT token with embedded user data

#### 2. `core` - Jobs, Applications & Chat

Core business logic for job postings, applications, and real-time chat.

**Files:**
- `models.py` - Job, JobApplication, JobMatchResult, Conversation, ChatMessage
- `views.py` - REST API endpoints
- `consumers.py` - WebSocket consumers
- `recommendation.py` - AI/ML matching engine
- `tasks.py` - Celery background tasks

#### 3. `jobcore` - Profile Management

Candidate and company profile management.

**Files:**
- `models.py` - CandidateProfile, CompanyProfile, Experience, Project, ProjectScreenshot
- `views.py` - Profile CRUD endpoints
- `serializers.py` - Profile data validation and serialization

---

### Models

#### User Model (`authentication/models.py`)

```python
class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_hr = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
```

**Fields:**
- `email` - Primary identifier (unique)
- `username` - Display name
- `is_hr` - Role flag (True for HR, False for Candidate)
- Inherited: `password`, `first_name`, `last_name`, `date_joined`, etc.

---

#### Job Model (`core/models.py`)

```python
class Job(models.Model):
    REMOTE = 'remote'
    HYBRID = 'hybrid'
    ONSITE = 'onsite'

    JOB_TYPE_CHOICES = [
        (REMOTE, 'Remote'),
        (HYBRID, 'Hybrid'),
        (ONSITE, 'On-site'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    job_type = models.CharField(max_length=10, choices=JOB_TYPE_CHOICES)
    job_location = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='jobs')
```

**Business Rules:**
- Only HR users can create jobs (enforced in `save()`)
- Remote jobs automatically have `job_location = None`
- Hybrid/On-site jobs require a location

---

#### JobApplication Model (`core/models.py`)

```python
class JobApplication(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='job_applications')
    cover_letter = models.TextField(blank=True)
    cv = models.FileField(upload_to='applications/cvs/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['job', 'applicant'], name='unique_job_application')
        ]
```

**Business Rules:**
- HR users cannot apply for jobs
- One application per job per candidate
- Cover letter: 30-4000 characters
- CV: PDF, DOC, DOCX, TXT; max 10MB

---

#### JobMatchResult Model (`core/models.py`)

```python
class JobMatchResult(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="match_results")
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name="job_match_results")
    score = models.FloatField(default=0.0)
    engine_version = models.CharField(max_length=32, default="legacy")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Purpose:**
- Caches computed match scores
- `engine_version` tracks algorithm changes for cache invalidation
- Scores range from 0.0 to 1.0

---

#### Conversation Model (`core/models.py`)

```python
class Conversation(models.Model):
    hr = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hr_conversations')
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='candidate_conversations')
    hr_last_seen_at = models.DateTimeField(null=True, blank=True)
    candidate_last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Methods:**
- `mark_seen(user)` - Updates last seen timestamp for user
- `unread_count_for_user(user)` - Counts unread messages

**Constraints:**
- Unique constraint on `(hr, candidate)`
- HR participant must have `is_hr=True`
- Candidate participant must have `is_hr=False`

---

#### ChatMessage Model (`core/models.py`)

```python
class ChatMessage(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField(blank=True)
    attachment = models.FileField(upload_to='chat/attachments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**Validation:**
- Sender must be a participant in the conversation
- Message must have text or attachment (not empty)
- Max text length: 3000 characters
- Max attachment size: 10MB

---

#### CandidateProfile Model (`jobcore/models.py`)

```python
class CandidateProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="candidate_profile")
    headline = models.CharField(max_length=255, blank=True)
    about = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    linkedin_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    profile_picture_url = models.URLField(blank=True)
    cv = models.FileField(upload_to="profiles/cvs/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

#### CompanyProfile Model (`jobcore/models.py`)

```python
class CompanyProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="company_profile")
    company_name = models.CharField(max_length=255, blank=True)
    about = models.TextField(blank=True)
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=120, blank=True)
    company_size = models.CharField(max_length=80, blank=True)
    headquarters = models.CharField(max_length=255, blank=True)
    logo_url = models.URLField(blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
```

---

#### Experience Model (`jobcore/models.py`)

```python
class Experience(models.Model):
    profile = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE, related_name="experiences")
    title = models.CharField(max_length=160)
    company = models.CharField(max_length=160)
    location = models.CharField(max_length=255, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(blank=True)
```

**Validation:**
- Current experiences cannot have an end date
- End date cannot be before start date

---

#### Project Model (`jobcore/models.py`)

```python
class Project(models.Model):
    profile = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    project_url = models.URLField(blank=True)
    repo_url = models.URLField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

class ProjectScreenshot(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="screenshots")
    image_url = models.URLField()
    caption = models.CharField(max_length=255, blank=True)
```

---

### API Endpoints

#### Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register/` | Create new user account | No |
| POST | `/login/` | Authenticate and get tokens | No |
| POST | `/token/refresh/` | Refresh access token | No (refresh token required) |
| GET | `/check-auth/` | Verify authentication status | Yes |

**Register Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword",
  "confirm_password": "securepassword",
  "is_hr": false
}
```

**Register/Login Response:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "is_hr": false,
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

#### Jobs (`/api/jobs/`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List jobs (paginated) | Yes | Any |
| POST | `/create/` | Create new job | Yes | HR |
| GET | `/<id>/` | Get job details | Yes | Any |
| PUT | `/<id>/` | Update job | Yes | HR (owner) |
| DELETE | `/<id>/` | Delete job | Yes | HR (owner) |
| POST | `/<id>/apply/` | Apply to job | Yes | Candidate |
| PUT | `/<id>/apply/` | Update application | Yes | Candidate |
| GET | `/<id>/match/` | Get match score | Yes | Candidate |
| GET | `/<id>/applications/` | List applicants | Yes | HR (owner) |

**List Jobs Query Parameters:**
- `page` - Page number (default: 1)
- `search` - Search in title, description, location
- `role` - Filter by role/title
- `location` - Filter by location
- `job_type` - Filter by type (remote, hybrid, onsite)

**Job Response:**
```json
{
  "id": 1,
  "title": "Senior Backend Developer",
  "description": "# About the Role\n\nWe're looking for...",
  "job_type": "remote",
  "job_location": null,
  "created_by_id": 1,
  "created_by_username": "hr_user",
  "has_applied": false,
  "user_cover_letter": null,
  "user_cv": null,
  "match_score": 0.7523,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Apply Request (multipart/form-data):**
```
cover_letter: "I am excited to apply for this position..."
cv: <file>
```

**Match Score Response:**
```json
{
  "job_id": 1,
  "match_score": 0.7523,
  "match_percentage": 75,
  "is_saved": true
}
```

**Applicants Response (with `?sort=proposal`):**
```json
[
  {
    "id": 1,
    "applicant_id": 5,
    "applicant_email": "candidate@example.com",
    "applicant_username": "johndoe",
    "cover_letter": "I am excited...",
    "cv": "http://localhost:8000/media/applications/cvs/resume.pdf",
    "proposal_score": 0.8234,
    "proposal_percentage": 82,
    "proposal_rank": 1,
    "created_at": "2024-01-15T11:00:00Z"
  }
]
```

---

#### Chat (`/api/jobs/chats/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List conversations | Yes |
| POST | `/start/` | Start/get conversation | Yes |
| GET | `/<conversation_id>/messages/` | Get messages | Yes |
| POST | `/<conversation_id>/messages/` | Send message | Yes |

**Start Conversation Request:**
```json
{
  "user_id": 5
}
```

**Conversation Response:**
```json
{
  "id": 1,
  "hr_id": 1,
  "hr_username": "hr_user",
  "candidate_id": 5,
  "candidate_username": "candidate",
  "other_user_id": 5,
  "other_user_username": "candidate",
  "other_user_is_hr": false,
  "last_message": "Thanks for reaching out!",
  "last_message_at": "2024-01-15T12:00:00Z",
  "unread_count": 2,
  "hr_last_seen_at": "2024-01-15T11:55:00Z",
  "candidate_last_seen_at": "2024-01-15T12:00:00Z",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Send Message Request (multipart/form-data):**
```
text: "Hello, I'd like to discuss the position."
attachment: <file> (optional)
```

**Message Response:**
```json
{
  "id": 1,
  "conversation": 1,
  "sender_id": 5,
  "sender_username": "candidate",
  "text": "Hello, I'd like to discuss the position.",
  "attachment_url": null,
  "attachment_name": null,
  "attachment_size": null,
  "created_at": "2024-01-15T12:05:00Z"
}
```

---

#### Profiles (`/api/profile/`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/me/` | Get candidate profile | Yes | Candidate |
| PUT | `/me/` | Update candidate profile | Yes | Candidate |
| GET | `/candidates/<user_id>/` | View candidate profile | Yes | HR |
| GET | `/company/` | Get company profile | Yes | HR |
| PUT | `/company/` | Update company profile | Yes | HR |
| GET | `/experiences/` | List experiences | Yes | Candidate |
| POST | `/experiences/` | Create experience | Yes | Candidate |
| PUT | `/experiences/<id>/` | Update experience | Yes | Candidate |
| DELETE | `/experiences/<id>/` | Delete experience | Yes | Candidate |
| GET | `/projects/` | List projects | Yes | Candidate |
| POST | `/projects/` | Create project | Yes | Candidate |
| PUT | `/projects/<id>/` | Update project | Yes | Candidate |
| DELETE | `/projects/<id>/` | Delete project | Yes | Candidate |

**Candidate Profile Response:**
```json
{
  "id": 1,
  "user_email": "candidate@example.com",
  "user_username": "johndoe",
  "headline": "Senior Full Stack Developer | 5+ Years Experience",
  "about": "Passionate developer with expertise in...",
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe",
  "portfolio_url": "https://johndoe.dev",
  "profile_picture_url": "https://example.com/photo.jpg",
  "cv_url": "http://localhost:8000/media/profiles/cvs/resume.pdf",
  "experiences": [...],
  "projects": [...],
  "created_at": "2024-01-10T09:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

### Serializers

#### JobSerializer (`core/serializers.py`)

```python
class JobSerializer(serializers.ModelSerializer):
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    has_applied = serializers.SerializerMethodField(read_only=True)
    user_cover_letter = serializers.SerializerMethodField(read_only=True)
    user_cv = serializers.SerializerMethodField(read_only=True)
    match_score = serializers.SerializerMethodField(read_only=True)
```

**Validation:**
- Remote jobs cannot have a location
- Hybrid/On-site jobs must have a location

---

#### JobApplicationSerializer (`core/serializers.py`)

```python
class JobApplicationSerializer(serializers.ModelSerializer):
    cv = serializers.FileField(required=False, allow_null=True)
    applicant_id = serializers.IntegerField(source='applicant.id', read_only=True)
    proposal_score = serializers.SerializerMethodField(read_only=True)
    proposal_percentage = serializers.SerializerMethodField(read_only=True)
```

**Validation:**
- Cover letter: 30-4000 characters
- CV: PDF, DOC, DOCX, TXT; max 10MB
- CV required on creation

---

### WebSocket Consumers

#### UserNotificationsConsumer (`core/consumers.py`)

**URL:** `ws://<host>/ws/notifications/?token=<access_token>`

**Purpose:** Broadcasts unread message counts and conversation updates.

**Events Received:**
```json
{"type": "unread_summary", "total_unread": 5}
```
```json
{
  "type": "conversation_update",
  "conversation": {...},
  "total_unread": 3
}
```

---

#### ConversationChatConsumer (`core/consumers.py`)

**URL:** `ws://<host>/ws/chat/<conversation_id>/?token=<access_token>`

**Purpose:** Real-time messaging within a conversation.

**Send Message:**
```json
{"text": "Hello!"}
```

**Mark as Seen:**
```json
{"action": "mark_seen"}
```

**Events Received:**
```json
{
  "type": "message",
  "id": 1,
  "sender_id": 5,
  "sender_username": "johndoe",
  "text": "Hello!",
  "attachment_url": null,
  "created_at": "2024-01-15T12:00:00Z"
}
```
```json
{
  "type": "seen",
  "conversation_id": 1,
  "seen_by_id": 5,
  "seen_by_username": "johndoe",
  "seen_at": "2024-01-15T12:00:05Z"
}
```
```json
{"type": "error", "detail": "Message cannot be empty."}
```

---

### AI/ML Recommendation Engine

#### Overview (`core/recommendation.py`)

The recommendation engine computes match scores between candidates and jobs using multiple signals:

1. **Semantic Text Similarity**
   - TF-IDF word n-grams (1-2 grams, 12000 features)
   - TF-IDF character n-grams (3-5 grams, 10000 features)
   - Dense embeddings via sentence-transformers (MiniLM-L6-v2)

2. **Skill Extraction**
   - Regex-based extraction of 50+ tech skills
   - F1 score computation for skill overlap

3. **Title Matching**
   - Token overlap between candidate headline and job title

4. **Location Compatibility**
   - Remote jobs: 1.0 (always compatible)
   - Matching location: 1.0
   - Partial match: 0.65
   - No location info: 0.35
   - No match: 0.2

#### Score Computation

**With Dense Embeddings (MiniLM):**
```
score = 0.68 * dense_score
       + 0.12 * word_tfidf_score
       + 0.08 * char_tfidf_score
       + 0.07 * skill_score
       + 0.03 * title_score
       + 0.02 * location_score
```

**Without Dense Embeddings (fallback):**
```
score = 0.52 * word_tfidf_score
       + 0.18 * char_tfidf_score
       + 0.18 * skill_score
       + 0.07 * title_score
       + 0.05 * location_score
```

#### Candidate Context Building

The engine builds candidate context from:
- Profile headline (4x weight)
- Profile about (2x weight)
- Profile location
- CV text (extracted from PDF/DOCX/TXT)
- Experience titles (3x weight), companies, descriptions (2x weight)
- Project names (2x weight) and descriptions
- Recent application cover letters and CVs

#### Caching

- Candidate context cached for 15 minutes
- Match scores cached in `JobMatchResult` model
- Cache invalidation on profile/CV updates via `invalidate_candidate_match_cache()`

#### Proposal Ranking

HR can rank applicants by proposal quality using `?sort=proposal`:
- Scores cover letter and CV against job description
- Same multi-signal approach as candidate matching

---

### Celery Tasks

#### delete_jobs_older_than_month (`core/tasks.py`)

```python
@shared_task
def delete_jobs_older_than_month():
    cutoff = timezone.now() - timedelta(days=30)
    stale_jobs = Job.objects.filter(created_at__lt=cutoff)
    stale_job_count = stale_jobs.count()
    stale_jobs.delete()
    return stale_job_count
```

**Schedule:** Daily at midnight UTC (configured in settings.py)

---

## Frontend Documentation

### React Components

#### App.jsx - Main Application

```jsx
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("access_token")
  );

  // Listens for auth changes across tabs
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("access_token");
      setIsAuthenticated(!!token);
    };
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);
    return () => {...};
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <JobsDashboard /> : <Navigate to="/login" />} />
        <Route path="/jobs/:id" element={isAuthenticated ? <JobDetailPage /> : <Navigate to="/login" />} />
        <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/profile/candidates/:userId" element={isAuthenticated ? <CandidateProfileDetailPage /> : <Navigate to="/login" />} />
        <Route path="/chat" element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
```

---

#### Login.jsx - Authentication

**Features:**
- Email/password form with validation
- Show/hide password toggle
- Error message display
- Automatic redirect on success
- Link to registration
- Animated card with Framer Motion

**Flow:**
1. User enters email and password
2. POST to `/api/auth/login/`
3. Store tokens in localStorage
4. Dispatch `auth-changed` event
5. Redirect to dashboard

---

#### Register.jsx - User Registration

**Features:**
- Username, email, password, confirm password fields
- HR role checkbox
- Password visibility toggles
- Form validation
- Automatic login on success

**Flow:**
1. User fills registration form
2. POST to `/api/auth/register/`
3. Store tokens in localStorage
4. Redirect to dashboard

---

#### JobsDashboard.jsx - Main Dashboard

**Features:**
- Paginated job listings (6 per page)
- Search by role/keyword and location
- Filter by job type (Remote/Hybrid/On-site)
- Job cards with Markdown description preview
- Expand/collapse descriptions
- Match score display for candidates
- "Match this job" button for on-demand scoring
- HR: Create, Edit, Delete jobs
- HR: Create Job modal with Markdown editor
- Unread DM counter via WebSocket
- Navigation to profile, chat, logout

**WebSocket Integration:**
- Connects to `/ws/notifications/` on mount
- Updates unread count on `unread_summary` and `conversation_update` events

---

#### JobDetailPage.jsx - Job Details

**Features:**
- Full job description with Markdown rendering
- Expand/collapse long descriptions
- Job type and location badges
- HR info with "Chat with HR" button

**For Candidates:**
- Application form with cover letter textarea
- Character counter and validation
- CV file upload with type/size validation
- Update existing application
- Success/error messages

**For HR:**
- Applicants list with pagination
- Sort by "Newest first" or "Rank by best proposal"
- Proposal rank and percentage badges
- View applicant cover letter (expand/collapse)
- View resume link
- Message candidate button
- View full profile button

---

#### ProfilePage.jsx - Profile Management

**Tabs (Candidates):**
1. **Profile** - Basic info, headline, about, social links, CV upload
2. **Experience** - CRUD for work history
3. **Projects** - CRUD for portfolio projects

**For HR:**
- Company profile form (no tabs)
- Company name, about, website, industry, size, headquarters, logo, founded year

**Features:**
- Tab navigation with counts
- Hero banner with avatar
- Form validation
- Success/error toast messages
- Edit/delete buttons on hover
- Screenshot gallery for projects

---

#### ChatPage.jsx - Real-time Messaging

**Features:**
- Conversation list sidebar with search
- Unread badges on conversations
- Last message preview
- Time stamps
- Message bubbles (own vs other)
- File attachment support
- Seen receipts
- Browser notifications
- Connection status indicator (Live/Reconnecting)

**WebSocket Integration:**
- Connects to `/ws/chat/<conversation_id>/` for active conversation
- Connects to `/ws/notifications/` for conversation updates
- Real-time message delivery
- Automatic seen marking on message receive
- Handles reconnection gracefully

**State Management:**
- Conversations list with real-time updates
- Messages array with deduplication
- Selected conversation tracking
- Draft message and attachment state
- Connection status

---

#### CandidateProfileDetailPage.jsx - HR View of Candidate

**Features (HR only):**
- Full candidate profile view
- Profile picture, headline, location
- About section
- Social links (LinkedIn, GitHub, Portfolio)
- Experience list
- Projects list with screenshots
- "Message Candidate" button
- Back navigation

---

#### JobForm.jsx - Job Create/Edit Modal

**Features:**
- Overlay modal with backdrop
- Title input
- Markdown editor with live preview (react-mde)
- Job type dropdown (Remote/Hybrid/On-site)
- Conditional location field
- Create/Update button
- Error display

---

### API Services

#### auth.js - Authentication Service

```javascript
import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE_URL;

const BaseAPI = axios.create({ baseURL: `${API_BASE}auth/` });
const AuthAPI = axios.create({ baseURL: API_BASE });

// Request interceptor: Attach access token
AuthAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: Auto-refresh on 401
AuthAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      const res = await BaseAPI.post("token/refresh/", { refresh });
      localStorage.setItem("access_token", res.data.access);
      return AuthAPI(originalRequest);
    }
    return Promise.reject(error);
  }
);

export const setTokens = (access, refresh) => {...};
export const clearTokens = () => {...};
export const logout = () => {...};
```

---

#### jobs.js - Jobs Service

```javascript
const JobsAPI = axios.create({ baseURL: `${API_BASE}jobs/` });

// Same interceptor pattern as AuthAPI
JobsAPI.interceptors.request.use(...);
JobsAPI.interceptors.response.use(...);

export default JobsAPI;
```

---

#### chat.js - Chat Service

```javascript
import AuthAPI from "./auth";

const ChatAPI = {
  listConversations: () => AuthAPI.get("jobs/chats/"),
  startConversation: (userId) => AuthAPI.post("jobs/chats/start/", { user_id: userId }),
  getMessages: (conversationId) => AuthAPI.get(`jobs/chats/${conversationId}/messages/`),
  sendMessage: (conversationId, payload) => {
    if (payload.attachment) {
      const formData = new FormData();
      formData.append("text", payload.text);
      formData.append("attachment", payload.attachment);
      return AuthAPI.post(`jobs/chats/${conversationId}/messages/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return AuthAPI.post(`jobs/chats/${conversationId}/messages/`, { text: payload.text });
  },
};
```

---

#### profile.js - Profile Service

```javascript
import AuthAPI from "./auth";

const ProfileAPI = {
  getCandidateProfile: () => AuthAPI.get("profile/me/"),
  getCandidateProfileByUserId: (userId) => AuthAPI.get(`profile/candidates/${userId}/`),
  updateCandidateProfile: (payload) => AuthAPI.put("profile/me/", payload, ...),
  getCompanyProfile: () => AuthAPI.get("profile/company/"),
  updateCompanyProfile: (payload) => AuthAPI.put("profile/company/", payload),
  getExperiences: () => AuthAPI.get("profile/experiences/"),
  createExperience: (payload) => AuthAPI.post("profile/experiences/", payload),
  updateExperience: (id, payload) => AuthAPI.put(`profile/experiences/${id}/`, payload),
  deleteExperience: (id) => AuthAPI.delete(`profile/experiences/${id}/`),
  getProjects: () => AuthAPI.get("profile/projects/"),
  createProject: (payload) => AuthAPI.post("profile/projects/", payload),
  updateProject: (id, payload) => AuthAPI.put(`profile/projects/${id}/`, payload),
  deleteProject: (id) => AuthAPI.delete(`profile/projects/${id}/`),
};
```

---

### State Management

The application uses React's built-in state management:

- **Local component state** (`useState`) for UI state
- **localStorage** for authentication tokens
- **Custom events** (`auth-changed`) for cross-component auth sync
- **WebSocket connections** for real-time state updates

**Token Storage:**
```javascript
localStorage.getItem("access_token")  // JWT access token
localStorage.getItem("refresh_token") // JWT refresh token
```

**Auth State Synchronization:**
```javascript
// Notify all components of auth change
window.dispatchEvent(new Event("auth-changed"));

// Listen for auth changes
window.addEventListener("auth-changed", checkAuth);
window.addEventListener("storage", checkAuth); // Cross-tab
```

---

### Routing

| Path | Component | Auth Required | Role |
|------|-----------|---------------|------|
| `/login` | Login | No | - |
| `/register` | Register | No | - |
| `/` | JobsDashboard | Yes | Any |
| `/jobs/:id` | JobDetailPage | Yes | Any |
| `/profile` | ProfilePage | Yes | Any |
| `/profile/candidates/:userId` | CandidateProfileDetailPage | Yes | HR |
| `/chat` | ChatPage | Yes | Any |

**Query Parameters:**
- `/chat?userId=5` - Start/open conversation with user
- `/chat?conversationId=1` - Open specific conversation

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  USERS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  authentication_user                                                         │
│  ─────────────────                                                           │
│  id              PK  INTEGER                                                 │
│  email           UQ  VARCHAR(254)                                            │
│  username            VARCHAR(150)                                            │
│  password            VARCHAR(128)                                            │
│  is_hr               BOOLEAN                                                 │
│  is_active           BOOLEAN                                                 │
│  date_joined         DATETIME                                                │
│  ...                 (other AbstractUser fields)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                │
                │ 1:N (created_by)
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   JOBS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  core_job                                                                    │
│  ────────                                                                    │
│  id              PK  INTEGER                                                 │
│  title               VARCHAR(255)                                            │
│  description         TEXT                                                    │
│  job_type            VARCHAR(10)  [remote, hybrid, onsite]                   │
│  job_location        VARCHAR(255) NULL                                       │
│  created_at          DATETIME                                                │
│  updated_at          DATETIME                                                │
│  created_by_id   FK  INTEGER → authentication_user                           │
│                                                                              │
│  INDEXES:                                                                    │
│  - jobapp_job_created_idx (job_id, created_at)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                │
                │ 1:N (applications)
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              JOB APPLICATIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  core_jobapplication                                                         │
│  ───────────────────                                                         │
│  id              PK  INTEGER                                                 │
│  cover_letter        TEXT                                                    │
│  cv                  VARCHAR(100) [file path]                                │
│  created_at          DATETIME                                                │
│  job_id          FK  INTEGER → core_job                                      │
│  applicant_id    FK  INTEGER → authentication_user                           │
│                                                                              │
│  CONSTRAINTS:                                                                │
│  - unique_job_application (job_id, applicant_id)                             │
│                                                                              │
│  INDEXES:                                                                    │
│  - jobapp_job_created_idx (job_id, created_at)                               │
│  - jobapp_app_created_idx (applicant_id, created_at)                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              MATCH RESULTS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  core_jobmatchresult                                                         │
│  ───────────────────                                                         │
│  id              PK  INTEGER                                                 │
│  score               FLOAT                                                   │
│  engine_version      VARCHAR(32)                                             │
│  created_at          DATETIME                                                │
│  updated_at          DATETIME                                                │
│  job_id          FK  INTEGER → core_job                                      │
│  candidate_id    FK  INTEGER → authentication_user                           │
│                                                                              │
│  CONSTRAINTS:                                                                │
│  - unique_job_match_result (job_id, candidate_id)                            │
│                                                                              │
│  INDEXES:                                                                    │
│  - jobmatch_cand_eng_idx (candidate_id, engine_version)                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               CONVERSATIONS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  core_conversation                                                           │
│  ─────────────────                                                           │
│  id              PK  INTEGER                                                 │
│  hr_last_seen_at     DATETIME NULL                                           │
│  candidate_last_seen_at DATETIME NULL                                        │
│  created_at          DATETIME                                                │
│  updated_at          DATETIME                                                │
│  hr_id           FK  INTEGER → authentication_user                           │
│  candidate_id    FK  INTEGER → authentication_user                           │
│                                                                              │
│  CONSTRAINTS:                                                                │
│  - unique_hr_candidate_conversation (hr_id, candidate_id)                    │
│                                                                              │
│  INDEXES:                                                                    │
│  - conv_hr_upd_idx (hr_id, updated_at)                                       │
│  - conv_cand_upd_idx (candidate_id, updated_at)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                │
                │ 1:N (messages)
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               CHAT MESSAGES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  core_chatmessage                                                            │
│  ────────────────                                                            │
│  id              PK  INTEGER                                                 │
│  text                TEXT                                                    │
│  attachment          VARCHAR(100) [file path]                                │
│  created_at          DATETIME                                                │
│  conversation_id FK  INTEGER → core_conversation                             │
│  sender_id       FK  INTEGER → authentication_user                           │
│                                                                              │
│  INDEXES:                                                                    │
│  - chatmsg_conv_created_idx (conversation_id, created_at)                    │
│  - chatmsg_conv_sender_idx (conversation_id, sender_id, created_at)          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            CANDIDATE PROFILES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  jobcore_candidateprofile                                                    │
│  ────────────────────────                                                    │
│  id              PK  INTEGER                                                 │
│  headline            VARCHAR(255)                                            │
│  about               TEXT                                                    │
│  location            VARCHAR(255)                                            │
│  linkedin_url        VARCHAR(200)                                            │
│  github_url          VARCHAR(200)                                            │
│  portfolio_url       VARCHAR(200)                                            │
│  profile_picture_url VARCHAR(200)                                            │
│  cv                  VARCHAR(100) [file path]                                │
│  created_at          DATETIME                                                │
│  updated_at          DATETIME                                                │
│  user_id         FK  INTEGER → authentication_user (1:1)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                │
                ├─────────── 1:N (experiences)
                │            ▼
                │   ┌─────────────────────────────────────────────────────────┐
                │   │  jobcore_experience                                      │
                │   │  ──────────────────                                      │
                │   │  id, title, company, location, start_date, end_date,    │
                │   │  is_current, description, profile_id FK                  │
                │   └─────────────────────────────────────────────────────────┘
                │
                └─────────── 1:N (projects)
                             ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │  jobcore_project                                         │
                    │  ───────────────                                         │
                    │  id, name, description, project_url, repo_url,          │
                    │  start_date, end_date, profile_id FK                     │
                    └─────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N (screenshots)
                                    ▼
                           ┌───────────────────────────────────────────────────┐
                           │  jobcore_projectscreenshot                        │
                           │  ─────────────────────────                        │
                           │  id, image_url, caption, project_id FK            │
                           └───────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             COMPANY PROFILES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  jobcore_companyprofile                                                      │
│  ──────────────────────                                                      │
│  id              PK  INTEGER                                                 │
│  company_name        VARCHAR(255)                                            │
│  about               TEXT                                                    │
│  website             VARCHAR(200)                                            │
│  industry            VARCHAR(120)                                            │
│  company_size        VARCHAR(80)                                             │
│  headquarters        VARCHAR(255)                                            │
│  logo_url            VARCHAR(200)                                            │
│  founded_year        INTEGER NULL                                            │
│  created_at          DATETIME                                                │
│  updated_at          DATETIME                                                │
│  user_id         FK  INTEGER → authentication_user (1:1)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          REGISTRATION FLOW                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Frontend                           Backend                                  │
│   ────────                           ───────                                  │
│                                                                               │
│   1. User fills form                                                          │
│      ─────────────────►                                                       │
│                                                                               │
│   2. POST /api/auth/register/                                                 │
│      {email, username, password,     3. Validate input                        │
│       confirm_password, is_hr}          - Email unique?                       │
│      ─────────────────────────────►     - Passwords match?                    │
│                                         - Create User                         │
│                                         - Generate JWT tokens                 │
│                                                                               │
│   4. Response                        ◄─ {email, username, is_hr,              │
│      ◄─────────────────────────────     access, refresh}                      │
│                                                                               │
│   5. Store tokens in localStorage                                             │
│      Dispatch 'auth-changed' event                                            │
│      Redirect to dashboard                                                    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                             LOGIN FLOW                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   1. POST /api/auth/login/           2. Validate credentials                  │
│      {email, password}                  - Find user by email                  │
│      ─────────────────────────────►     - Check password                      │
│                                         - Generate JWT with claims:           │
│                                           {user_id, is_hr, email, username}   │
│                                                                               │
│   3. Response                        ◄─ {email, username, is_hr,              │
│      ◄─────────────────────────────     access, refresh}                      │
│                                                                               │
│   4. Same as registration step 5                                              │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          API REQUEST FLOW                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   1. Axios interceptor attaches      Authorization: Bearer <access_token>     │
│      ─────────────────────────────────────────────────────────────────►      │
│                                                                               │
│   2. DRF JWTAuthentication validates token                                    │
│      - Check signature                                                        │
│      - Check expiration                                                       │
│      - Load user from user_id claim                                           │
│                                                                               │
│   3a. Token valid                    → Process request normally               │
│                                                                               │
│   3b. Token expired (401)            → Interceptor catches error              │
│       ◄──────────────────────                                                 │
│                                                                               │
│   4. POST /api/auth/token/refresh/   5. Validate refresh token                │
│      {refresh}                          - Check signature                     │
│      ─────────────────────────────►     - Check expiration                    │
│                                         - Generate new access token           │
│                                                                               │
│   6. Response                        ◄─ {access}                              │
│      ◄─────────────────────────────                                           │
│                                                                               │
│   7. Update localStorage                                                      │
│      Retry original request with new token                                    │
│                                                                               │
│   8. If refresh fails → Clear tokens, redirect to login                       │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Real-time Chat System

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        WEBSOCKET CHAT ARCHITECTURE                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                         Browser (User A)                             │    │
│   │  ┌─────────────────────────────────────────────────────────────┐    │    │
│   │  │   ChatPage Component                                         │    │    │
│   │  │   ─────────────────                                          │    │    │
│   │  │   - conversations state                                      │    │    │
│   │  │   - messages state                                           │    │    │
│   │  │   - selectedConversationId                                   │    │    │
│   │  │   - otherParticipantSeenAt                                   │    │    │
│   │  └───────────────────────────────┬─────────────────────────────┘    │    │
│   │                                  │                                   │    │
│   │                    ┌─────────────┴─────────────┐                    │    │
│   │                    ▼                           ▼                    │    │
│   │   ┌──────────────────────────┐  ┌──────────────────────────────┐   │    │
│   │   │  Notifications WS         │  │  Conversation WS              │   │    │
│   │   │  /ws/notifications/       │  │  /ws/chat/<conv_id>/          │   │    │
│   │   │  ────────────────────     │  │  ─────────────────────────    │   │    │
│   │   │  • unread_summary         │  │  • Send text message          │   │    │
│   │   │  • conversation_update    │  │  • Receive message            │   │    │
│   │   └───────────┬──────────────┘  │  • seen event                  │   │    │
│   │               │                  │  • mark_seen action            │   │    │
│   │               │                  └───────────┬──────────────────┘   │    │
│   └───────────────┼──────────────────────────────┼───────────────────────┘    │
│                   │                              │                            │
│                   │ WebSocket                    │ WebSocket                  │
│                   │ Connection                   │ Connection                 │
│                   ▼                              ▼                            │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                           ASGI Server (Daphne)                        │   │
│   │  ┌────────────────────────────────────────────────────────────────┐  │   │
│   │  │                    Channels Layer                               │  │   │
│   │  │                    (InMemoryChannelLayer / Redis)               │  │   │
│   │  │  ┌────────────────────┐  ┌────────────────────┐                │  │   │
│   │  │  │ Group: user_1      │  │ Group: chat_5      │                │  │   │
│   │  │  │ (User A notifs)    │  │ (Conversation 5)   │                │  │   │
│   │  │  └────────────────────┘  └────────────────────┘                │  │   │
│   │  └────────────────────────────────────────────────────────────────┘  │   │
│   │  ┌────────────────────────────────────────────────────────────────┐  │   │
│   │  │               WebSocket Consumers                               │  │   │
│   │  │  ┌──────────────────────────┐  ┌─────────────────────────────┐ │  │   │
│   │  │  │ UserNotificationsConsumer│  │ ConversationChatConsumer    │ │  │   │
│   │  │  │ ─────────────────────────│  │ ────────────────────────────│ │  │   │
│   │  │  │ • Token auth on connect  │  │ • Token auth on connect     │ │  │   │
│   │  │  │ • Join user_{id} group   │  │ • Verify participant        │ │  │   │
│   │  │  │ • Send unread summary    │  │ • Join chat_{conv_id} group │ │  │   │
│   │  │  │ • Forward chat_notify    │  │ • Handle text messages      │ │  │   │
│   │  │  └──────────────────────────┘  │ • Handle mark_seen          │ │  │   │
│   │  │                                │ • Broadcast to group        │ │  │   │
│   │  │                                └─────────────────────────────┘ │  │   │
│   │  └────────────────────────────────────────────────────────────────┘  │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         MESSAGE FLOW EXAMPLE                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   User A (HR)                     Server                     User B (Candidate)│
│   ───────────                     ──────                     ─────────────────│
│                                                                               │
│   1. Send message via WS                                                      │
│      {"text": "Hello!"}                                                       │
│      ─────────────────►                                                       │
│                                                                               │
│                          2. ConversationChatConsumer                          │
│                             • Validate message                                │
│                             • Create ChatMessage                              │
│                             • Mark sender as seen                             │
│                             • broadcast_chat_message()                        │
│                             • broadcast_conversation_update()                 │
│                                                                               │
│   3. Receive message                                                          │
│      {"type": "message",    ◄─────────────────────────────────────►   3.     │
│       "id": 1,                      (broadcast to chat_{conv_id})      Receive│
│       "sender_id": 1,                                                         │
│       "text": "Hello!"}                                                       │
│                                                                               │
│   4. (via notifications WS)                                            4.     │
│      {"type": "conversation_update",  ◄───────────────────────────►   Receive│
│       "conversation": {...},          (broadcast to user_{id})        update  │
│       "total_unread": 0}                                               +1     │
│                                                                        unread │
│                                                                               │
│                                                                 5. Auto-mark  │
│                                                                    seen via   │
│                                                                    WS handler │
│                                                                               │
│   6. Receive seen event      ◄───────────────────────────────────────────────│
│      {"type": "seen",                                                         │
│       "seen_by_id": 2,                                                        │
│       "seen_at": "..."}                                                       │
│                                                                               │
│   7. Update UI with                                                           │
│      "Seen" indicator                                                         │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

### Backend `.env`

```bash
# Django
SECRET_KEY=replace-with-a-strong-secret-key

# JWT Token Lifetimes
access_expire=60          # Access token lifetime in minutes
token_expire=30           # Refresh token lifetime in days

# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_HOST=0.0.0.0
FRONTEND_PORT=5173
VITE_API_BASE_URL=http://localhost:8000/api/

# PostgreSQL
POSTGRES_DB=patchtalent
POSTGRES_USER=patchtalent
POSTGRES_PASSWORD=patchtalent
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Celery / Redis
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

### Frontend `.env`

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/
```

---

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 22+
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (for Celery, or use Docker)

### Backend Setup

```bash
# Clone repository
git clone https://github.com/osafavendev/PatchTalent.git
cd patchtalent

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Run development server
python manage.py runserver
# Or with Daphne (for WebSocket support):
daphne -b 0.0.0.0 -p 8000 patchtalent.asgi:application
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Run development server
npm run dev
```

### Celery Setup (for background tasks)

```bash
# Start Redis first (or use Docker)
redis-server

# In separate terminals:

# Terminal 1: Celery Worker
celery -A patchtalent worker -l info

# Terminal 2: Celery Beat (scheduler)
celery -A patchtalent beat -l info
```

---

## Docker Deployment

### Docker Compose Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| postgres | postgres:16-alpine | 5432 | PostgreSQL database |
| redis | redis:7-alpine | 6379 | Message broker |
| backend | Python 3.14 | 8000 | Django + Daphne |
| celery_worker | Python 3.14 | - | Background task processor |
| celery_beat | Python 3.14 | - | Task scheduler |
| frontend | Node.js 22 | 5173 | React + Vite dev server |

### Quick Start

```bash
# Prepare environment files
cp .env.example .env
cp frontend/.env.example frontend/.env

# Build and start all services
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Access Points

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api/
- **Admin Panel:** http://localhost:8000/admin/
- **WebSocket Notifications:** ws://localhost:8000/ws/notifications/
- **WebSocket Chat:** ws://localhost:8000/ws/chat/<id>/

### Dockerfile (Backend)

```dockerfile
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

COPY . /app

CMD ["sh", "-c", "python manage.py migrate && daphne -b ${BACKEND_HOST} -p ${BACKEND_PORT} patchtalent.asgi:application"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json /app/
RUN npm install --legacy-peer-deps

COPY . /app

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
```

---

## Testing

### Backend Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test core
python manage.py test jobcore
python manage.py test authentication

# Run with verbosity
python manage.py test -v 2

# Run Django system checks
python manage.py check
```

### Frontend Tests

```bash
cd frontend

# Run ESLint
npm run lint

# Build for production (validates build)
npm run build
```

---

## Security Considerations

### Authentication
- JWT tokens with short access lifetime (default: 60 minutes)
- Refresh tokens with longer lifetime (default: 30 days)
- Token blacklisting support via `rest_framework_simplejwt.token_blacklist`
- Passwords stored using Django's PBKDF2 hasher

### Authorization
- Role-based access control (`is_hr` flag)
- Object-level permissions (job owner, conversation participant)
- Validated at view level and model level

### Data Validation
- Input sanitization via DRF serializers
- File type and size validation for uploads
- Cover letter length constraints
- SQL injection prevention via Django ORM

### WebSocket Security
- Token authentication on WebSocket connect
- Participant validation before joining chat rooms
- Message sender verification

### CORS
- Configured via `django-cors-headers`
- `CORS_ALLOW_ALL_ORIGINS = True` in development (restrict in production)

### File Uploads
- Stored in `media/` directory
- File type validation (PDF, DOC, DOCX, TXT)
- File size limits (10MB)
- Served via Django's media URL handler

### Environment Security
- Secrets stored in `.env` files
- `.env` excluded from version control
- Example files provided (`.env.example`)

---

## License

MIT License

Copyright (c) 2026 osafavendev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Support

For issues and feature requests, please use the GitHub issue tracker.
