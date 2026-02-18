#!/usr/bin/env python
"""Thin wrapper — delegates to pipeline.main()."""
from pipeline import main

if __name__ == "__main__":
    raise SystemExit(main())
