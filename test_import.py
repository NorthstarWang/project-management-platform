#!/usr/bin/env python
import sys
sys.path.insert(0, '/app')

try:
    from app.routes import time_tracking
    print('Import successful')
    print(f'Router prefix: {time_tracking.router.prefix}')
    print(f'Number of routes: {len(time_tracking.router.routes)}')
except Exception as e:
    print(f'Import failed: {e}')
    import traceback
    traceback.print_exc()