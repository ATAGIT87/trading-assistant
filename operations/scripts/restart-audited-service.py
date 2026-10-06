"""Replace this workspace's listener and its Nest watcher; refuse unrelated processes."""
import os, signal, subprocess, time, shlex
from pathlib import Path
root = str(Path.cwd())
node = '/opt/homebrew/Cellar/node@24/24.21.0_1/bin/node'
listeners = subprocess.run(['lsof','-t','-iTCP:3000','-sTCP:LISTEN'],capture_output=True,text=True).stdout.split()
owned = []
# Relative CLI commands do not include the root path; prove ownership by cwd.
for row in subprocess.check_output(['ps','-axo','pid=,command='],text=True).splitlines():
    fields=row.strip().split(None,1)
    if len(fields)!=2: continue
    try: args=shlex.split(fields[1])
    except ValueError: continue
    watcher=any(a.endswith('/@nestjs/cli/bin/nest.js') for a in args) and 'start' in args and '--watch' in args
    if not watcher: continue
    pid=int(fields[0])
    cwd=subprocess.run(['lsof','-a','-p',str(pid),'-d','cwd','-Fn'],capture_output=True,text=True).stdout.splitlines()
    if 'n'+root in cwd: owned.append(pid)

for value in set(listeners):
    pid = int(value)
    command = subprocess.check_output(['ps','-p',str(pid),'-o','command='],text=True).strip()
    if not any(root + suffix in command for suffix in ['/dist/production/main', '/dist/src/main', '/dist/main']):
        raise SystemExit('Refusing to stop an unrelated listener on port 3000.')
    parent = int(subprocess.check_output(['ps','-p',str(pid),'-o','ppid='],text=True).strip())
    parent_command = subprocess.check_output(['ps','-p',str(parent),'-o','command='],text=True).strip()
    if root in parent_command and 'nest.js start --watch' in parent_command:
        owned.append(parent)
    owned.append(pid)
for pid in dict.fromkeys(owned):
    try: os.kill(pid,signal.SIGTERM)
    except ProcessLookupError: pass
for _ in range(50):
    remaining = subprocess.run(['lsof','-t','-iTCP:3000','-sTCP:LISTEN'],capture_output=True,text=True).stdout.strip()
    if not remaining: break
    time.sleep(0.1)
else: raise SystemExit('Listener did not stop; refusing to start a second instance.')
env = os.environ.copy()
env['PATH'] = str(Path(node).parent) + ':' + env.get('PATH','')
env['DB_SYNCHRONIZE'] = 'false'
os.execve(node,[node,'node_modules/@nestjs/cli/bin/nest.js','start','--watch'],env)
