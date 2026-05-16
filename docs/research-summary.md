# Research Summary for Lung Cancer Screening

This repository now includes a research-backed layer for the lung cancer assessment flow. The following documents were read and summarized to inform both the sensor evaluation and the questionnaire risk logic.

## Documents and Key Findings

1. `docs/research.pdf`
   - Pilot study using a low-cost MOS sensor array and a single alkane sensor.
   - Key sensors: `TGS2602`, `TGS2620`, `MQ-2`, `MQ135`.
   - Healthy breath patterns tended to have lower sensor resistance values, while lung cancer samples showed higher resistance and larger variance.
   - Used to guide sensor thresholding and key-sensor weighting.

2. `docs/research1.pdf`
   - Review of lung cancer risk factors in Thailand.
   - Important factors: smoking, marijuana, air pollution, PM2.5, occupational exposure, and family history.
   - Supports the questionnaire weights and reinforces environmental risk in the model.

3. `docs/research2.pdf`
   - Spatial analysis of lung cancer mortality in Northern Thailand.
   - High-risk clusters correlate with air pollution, geography, and local environment.
   - Used to justify stronger environmental risk impacts for regional and PM2.5 exposure.

4. `docs/research3.pdf`
   - Radon exposure assessment in Upper Northern Thailand.
   - Radon is confirmed as the second leading cause of lung cancer after smoking.
   - Also highlights a strong synergistic effect with smoking.

5. `docs/research4.pdf`
   - VOC biomarkers for cancer screening and diagnosis.
   - Differentiates exogenous and endogenous VOC signatures.
   - Emphasizes the need for multi-sensor pattern recognition rather than a single VOC.

6. `docs/research5.pdf`
   - Lung cancer VOC biomarker summaries.
   - Commonly reported VOCs: acetone, toluene, benzene, pentane, hexanal, isoprene.
   - Shows that breath biomarker panels are useful but vary across studies.

7. `docs/research6.pdf`
   - Meta-analysis of VOC-based cancer diagnosis and sensor techniques.
   - Reports strong diagnostic accuracy (AUC ~0.91) for breath-based methods.
   - Reinforces that sensor array models can be comparable to analytical mass-spectrometry approaches.

## Implementation Notes

- `src/lib/research.ts` now stores document metadata, key sensor guidance, and research-based boosting logic.
- `src/lib/risk.ts` uses research-informed boosts for radon-related environmental risk and smoking synergy.
- `src/pages/Assessment.tsx` displays the researched reference list and passes environmental/smoking context into sensor scoring.

## Research Integration Summary

The system now uses both the questionnaire and the simulated sensor array with research-derived reasoning:

- Sensor values are modeled after low-cost MOS studies.
- Key sensors receive higher weight when their readings are elevated.
- Environmental hazards such as radon and PM2.5 are given evidence-based score boosts.
- Smoking status influences both static risk and dynamic research risk.
