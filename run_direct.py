import uvicorn, sys, os, time
os.chdir(r"C:\Users\Mohammad\OneDrive\Desktop\X_KA_HASH-main")
sys.path.insert(0, '.')
from api.app import app

uvicorn.run(app, host='127.0.0.1', port=8000, log_level='info')
