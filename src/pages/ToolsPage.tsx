import { useState } from "react";
import type { Dataset, ValidationError } from "../domain";
import {
  MAX_IMPORT_BYTES,
  parseDatasetImport,
  compareBasket,
  rankCompleteStores,
  parisDate,
} from "../domain";
import { getEvents, clearEvents } from "../services/analytics";
import { downloadFile } from "../services/export";
import { demoDataset } from "../data";
import { Upload, Download, Info } from "lucide-react";
export default function ToolsPage({
  dataset,
  onApply,
  onDemo,
}: {
  dataset: Dataset;
  onApply: (dataset: Dataset) => void;
  onDemo: () => void;
}) {
  const [preview, setPreview] = useState<Dataset | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState(getEvents());
  async function readFile(file: File | undefined) {
    setPreview(null);
    setErrors([]);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setErrors([
        { path: "file", message: "Choose a JSON file no larger than 2 MB." },
      ]);
      return;
    }
    setBusy(true);
    try {
      const result = parseDatasetImport(await file.text());
      if (result.success) setPreview(result.data);
      else setErrors(result.errors);
    } catch {
      setErrors([
        {
          path: "file",
          message:
            "The file could not be read. Your current dataset is unchanged.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  const previewComparisons = preview
    ? compareBasket(
        preview,
        preview.items.map((x) => ({ itemId: x.id, quantity: 1 })),
        {
          origin: { lat: 48.853, lon: 2.369, label: "Bastille" },
          radiusKm: 3,
          maxObservationAgeDays: 90,
          asOfDate: parisDate(),
        },
      )
    : [];
  return (
    <section className="content-page tools-page">
      <p className="eyebrow">LOCAL TOOLS</p>
      <h1>
        Inspect the data.
        <br />
        Understand the interaction.
      </h1>
      <p className="lead">
        Import a normalized snapshot on this device, or inspect events from this
        browser session. Files and events are never uploaded.
      </p>
      <div className="tools-grid">
        <article className="tool-card">
          <div className="section-heading">
            <h2>Dataset import</h2>
            <Upload size={20} />
          </div>
          <p>
            JSON only · maximum 2 MB and 5,000 observations. An import replaces
            the active dataset only after you review and apply it.
          </p>
          <label className="upload-label" htmlFor="dataset-file">
            Choose a normalized dataset
          </label>
          <input
            id="dataset-file"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => void readFile(e.target.files?.[0])}
          />
          {busy && <p role="status">Validating dataset…</p>}
          {errors.length > 0 && (
            <div role="alert" className="import-errors">
              <strong>Dataset rejected. Current data is unchanged.</strong>
              <ul>
                {errors.map((x, i) => (
                  <li key={i}>
                    <code>{x.path}</code>: {x.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview && (
            <div className="import-preview">
              <h3>{preview.title}</h3>
              <dl>
                <dt>Mode</dt>
                <dd>
                  {preview.mode === "demo"
                    ? "Synthetic demo"
                    : "Observed snapshot"}
                </dd>
                <dt>Version</dt>
                <dd>{preview.version}</dd>
                <dt>Coverage</dt>
                <dd>
                  {preview.items.length} items · {preview.stores.length} stores
                  · {preview.observations.length} prices
                </dd>
                <dt>All-item baskets</dt>
                <dd>
                  {rankCompleteStores(previewComparisons).length} complete
                  within 3 km of Bastille at a 90-day cutoff
                </dd>
              </dl>
              <p>
                Applying clears the current basket. Imported data stays in
                memory for this session; share links are disabled.
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  onApply(preview);
                  setPreview(null);
                }}
              >
                Apply this dataset
              </button>
              <button className="text-button" onClick={() => setPreview(null)}>
                Cancel
              </button>
            </div>
          )}
          <div className="tool-actions">
            <button
              onClick={() =>
                downloadFile(
                  JSON.stringify(demoDataset, null, 2),
                  "basketmap-demo-v1.json",
                )
              }
            >
              <Download size={14} />
              Download example JSON
            </button>
            <button
              onClick={() =>
                downloadFile(
                  JSON.stringify(dataset, null, 2),
                  "basketmap-active-dataset.json",
                )
              }
            >
              <Download size={14} />
              Export active dataset
            </button>
          </div>
          <p className="fine-print">
            Active: {dataset.title} / {dataset.version}. Schema validation
            checks structure; it does not independently verify shelf prices or a
            claimed human check.
          </p>
          {dataset !== demoDataset && (
            <button className="text-button" onClick={onDemo}>
              Return to bundled demo
            </button>
          )}
        </article>
        <article className="tool-card">
          <div className="section-heading">
            <h2>Events from this browser session</h2>
            <Info size={20} />
          </div>
          <p>
            Capped at 200 local events. This is a QA viewer, not aggregate
            visitor analytics. No external collection endpoint is connected.
          </p>
          <div className="tool-actions">
            <button onClick={() => setEvents(getEvents())}>
              Refresh events
            </button>
            <button
              onClick={() => {
                downloadFile(
                  JSON.stringify(
                    {
                      scope:
                        "This browser session only; QA traffic is not user research",
                      events: getEvents(),
                    },
                    null,
                    2,
                  ),
                  "basketmap-session-events.json",
                );
              }}
            >
              <Download size={14} />
              Export event log
            </button>
            <button
              onClick={() => {
                clearEvents();
                setEvents([]);
              }}
            >
              Clear events
            </button>
          </div>
          <div className="event-list">
            {events.length ? (
              events
                .slice()
                .reverse()
                .map((event, i) => (
                  <details key={event.at + event.name + i}>
                    <summary>
                      <span>{event.name}</span>
                      <time>{event.at.slice(11, 19)} UTC</time>
                    </summary>
                    <pre>{JSON.stringify(event.properties, null, 2)}</pre>
                  </details>
                ))
            ) : (
              <p>No events in this browser session.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
