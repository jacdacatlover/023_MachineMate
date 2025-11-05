# Next Steps

## Immediate
- Curate 10–12 high-quality reference photos for each catalog machine (multiple angles, lighting). Place them in `assets/reference-machines/<labelId>/` and run `npm run embed:references` with `EXPO_PUBLIC_HF_TOKEN` to refresh SigLIP reference embeddings.
- Instrument the SigLIP pipeline to log low-confidence predictions (score < 0.45) and user overrides so we can triage problem photos for labeling.

## Near Term
- Integrate AWS Rekognition label detection as a fallback when SigLIP returns `kind: 'generic'` or `kind: 'not_gym'`. Cache results per photo URI to control costs, and map Rekognition labels into the existing synonym table.
- Add a lightweight detection pass (YOLOv8n or MobileNet SSD) to crop likely gym-equipment regions before embedding; fall back to the full frame if no bounding box is returned.
- Draft a lightweight annotation workflow (e.g., shared spreadsheet or Label Studio) so tagged fallback photos can feed the future fine-tuning set.

## Long Term
- Collect 400–500 labeled user photos (including negatives) and fine-tune SigLIP / ViT with LoRA adapters. Evaluate against held-out test images before rollout.
- Explore on-device inference by training a quantized MobileNetV3/ EfficientNet-Lite classifier for offline usage, with the cloud stack as a tie-breaker.
- Expand the catalog taxonomy (e.g., attachments, brands) to support richer guidance once machine identification is stable.
