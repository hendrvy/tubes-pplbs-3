# Synthetic ML Dataset

This directory contains the generated dataset for the Python ML service.

Regenerate it with:

```bash
python scripts/generate_dataset.py --rows 6000 --seed 42
```

The dataset is synthetic but shaped around the Smart Crowd Control domain:
crowd density, time patterns, weather, zone geometry, event intensity, risk
labels, and injected anomaly signals.

