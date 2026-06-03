@echo off
echo Starting Optimed Backend Setup...

cd backend

IF NOT EXIST ".env" (
    echo [ERROR] backend\.env file not found. Please copy .env.example to .env and configure it.
    exit /b 1
)

IF NOT EXIST ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Activating virtual environment...
call .venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt

echo Initializing Database...
python -m app.db.init_db

echo Starting Server...
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

cd ..
