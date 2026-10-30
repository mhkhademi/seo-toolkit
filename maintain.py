#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""فراخوان اسکریپت اصلی نگهداری و همگام‌سازی از ریشه پروژه."""
import pathlib
import subprocess
import sys

target = pathlib.Path(__file__).resolve().parent / "scripts" / "maintain.py"
sys.exit(subprocess.run([sys.executable, str(target)] + sys.argv[1:]).returncode)
