# TRACE — Threat Relationship Analysis & Case Explorer

**An AI-powered investigation-support prototype using Knowledge Graphs and GraphRAG.**

TRACE explores potential connections across multiple documents by extracting entities and relationships, storing them in a Neo4j knowledge graph, and answering investigation-related questions using retrieved graph information and supporting source records.

> **Status:** Working prototype under active development. TRACE is designed to support investigation and evidence exploration, not to establish guilt or replace human judgment.

## Features

- **Document ingestion:** Upload PDF and TXT documents.
- **AI-powered extraction:** Extract entities and relationships from document text using an LLM through OpenRouter.
- **Knowledge graph:** Store entities, documents, and relationships in Neo4j.
- **Graph visualization:** Explore connections using React, TypeScript, and React Flow.
- **Multi-document exploration:** View graph connections across multiple uploaded documents.
- **GraphRAG-style Q&A:** Ask questions and retrieve graph-related context with supporting source records.
- **Evidence checking:** Compare extracted quotations against normalized source text.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Graph visualization | React Flow |
| Backend | Python, FastAPI |
| LLM integration | OpenRouter API |
| Graph database | Neo4j |
| Document processing | pypdf |
| API testing | FastAPI Swagger UI |

## Architecture

```text
PDF / TXT Documents
        |
        v
FastAPI Backend
        |
        v
Text Extraction
        |
        v
LLM Entity & Relationship Extraction
        |
        v
Evidence Quote Validation
        |
        v
Neo4j Knowledge Graph
        |
        +--------------------+
        |                    |
        v                    v
React Flow Graph       GraphRAG-style Q&A
Visualization          + Source Records
```

## Project Structure

```text
TRACE/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── test_openrouter.py
├── backups/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── .gitignore
```

## Local Setup

### Prerequisites

- Python installed
- Node.js and npm installed
- Neo4j Desktop or another accessible Neo4j instance
- An OpenRouter API key

### 1. Clone the repository

```bash
git clone https://github.com/Geetanshu29/TRACE-Investigation-Graph.git
cd TRACE-Investigation-Graph
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Configure environment variables in `backend/.env` using the variable names expected by `backend/main.py`. Add your own API key and Neo4j connection credentials. Never commit real credentials.

Start the backend from the `backend` directory:

```bash
python -m uvicorn main:app --reload --port 8000
```

Backend: `http://127.0.0.1:8000`

API documentation: `http://127.0.0.1:8000/docs`

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

To verify the production build:

```bash
npm run build
```

## Current Limitations

- Scanned PDFs requiring OCR are not currently supported by the text-extraction workflow.
- LLM-extracted relationships may be incorrect or incomplete.
- Quote matching does not independently prove that a claim is true.
- Duplicate evidence and source attribution require further improvement.
- Advanced semantic retrieval and comprehensive multi-hop investigation remain areas for improvement.
- The application is a local prototype and has not been presented as production-ready for sensitive operational case data.

## Future Improvements

- Improve evidence traceability and deduplication.
- Add stronger entity resolution and human review for ambiguous matches.
- Improve multi-hop graph retrieval.
- Add timeline-based event exploration.
- Strengthen testing, authentication, authorization, audit logging, and data protection.

## Responsible Use

Use synthetic or explicitly authorized documents for testing. Treat generated connections as investigative leads that require independent verification, not as proof of wrongdoing.

## Author

**Geetanshu Arora**

GitHub: [Geetanshu29](https://github.com/Geetanshu29)

---

*TRACE is an experimental investigation-support project under active development.*