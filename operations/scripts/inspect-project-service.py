import subprocess, shlex
from pathlib import Path
root=str(Path.cwd())
for line in subprocess.check_output(['ps','-axo','pid=,ppid=,command='],text=True).splitlines():
    parts=line.strip().split(None,2)
    if len(parts)<3: continue
    pid,ppid,cmd=parts
    try: args=shlex.split(cmd)
    except ValueError: continue
    watcher=any(a.endswith('/@nestjs/cli/bin/nest.js') for a in args) and 'start' in args and '--watch' in args
    listener=any(a.startswith(root+'/dist/production/main') or a.startswith(root+'/dist/src/main') or a.startswith(root+'/dist/main') for a in args)
    if not (watcher or listener): continue
    cwd=subprocess.run(['lsof','-a','-p',pid,'-d','cwd','-Fn'],capture_output=True,text=True).stdout.splitlines()
    if 'n'+root in cwd:print({'pid':int(pid),'parent':int(ppid),'role':'watcher' if watcher else 'app','workspace':root})
