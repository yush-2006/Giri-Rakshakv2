# Database Setup

## Local development

The backend can run with SQLite when `DATABASE_URL` is not configured.

From the `backend` directory:

```bash
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000