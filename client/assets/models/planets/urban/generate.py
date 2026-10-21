import runpy
from pathlib import Path
ns=runpy.run_path(str(Path(__file__).resolve().parents[1]/'generate_planets.py'))
ns['build']('urban')
