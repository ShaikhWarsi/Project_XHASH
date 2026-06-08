"""Copy TradingAgents-main/tradingagents/ to integrations/tradingagents/, rewriting imports."""
import os
import re
import shutil

SRC = os.path.join(os.path.dirname(os.path.dirname(__file__)), "TradingAgents-main", "tradingagents")
DST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "integrations", "tradingagents")

REWRITE_PATTERNS = [
    (re.compile(r'^from\s+tradingagents\.'), 'from integrations.tradingagents.'),
    (re.compile(r'^import\s+tradingagents\.'), 'import integrations.tradingagents.'),
]

SKIP_DIRS = {'__pycache__', '.git', 'node_modules', 'tests'}
SKIP_FILES = {'test_', 'conftest.py'}

def should_skip(name: str) -> bool:
    if name.startswith('test_') or name == 'conftest.py':
        return True
    return False

def rewrite_file(src_path: str, dst_path: str):
    with open(src_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for pattern, replacement in REWRITE_PATTERNS:
        content = pattern.sub(replacement, content)
    
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    with open(dst_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  Copied: {os.path.relpath(dst_path, os.path.dirname(DST))}")

def copy_all(src: str, dst: str):
    for root, dirs, files in os.walk(src):
        # Skip unwanted dirs
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for file in files:
            if should_skip(file):
                continue
            src_file = os.path.join(root, file)
            rel = os.path.relpath(src_file, src)
            dst_file = os.path.join(dst, rel)
            if file.endswith('.py'):
                rewrite_file(src_file, dst_file)
            else:
                os.makedirs(os.path.dirname(dst_file), exist_ok=True)
                shutil.copy2(src_file, dst_file)
                print(f"  Copied: {rel}")

if __name__ == '__main__':
    print(f"Source: {SRC}")
    print(f"Dest:   {DST}")
    copy_all(SRC, DST)
    print("\nDone! All files copied with import rewrites.")
