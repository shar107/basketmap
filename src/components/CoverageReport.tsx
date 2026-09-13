import report from "../data/coverage.json";
import { appPath } from "../base";
export default function CoverageReport() {
  return (
    <div className="coverage-summary">
      <div className="coverage-grid">
        <div>
          <strong>{report.rawRowCount}</strong>
          <span>observations</span>
        </div>
        <div>
          <strong>{report.branchCount}</strong>
          <span>locations</span>
        </div>
        <div>
          <strong>{report.barcodesAtMultipleBranches}</strong>
          <span>shared barcodes</span>
        </div>
      </div>
      <p>
        Checked {report.dateWindow.to}: {report.dateWindow.from}–
        {report.dateWindow.to}, within 3 km of Bastille. {report.pagesExamined}{" "}
        page examined
        {report.capped
          ? " · capped sample"
          : ` · all ${report.reportedTotal} returned records examined`}
        .
      </p>
      <p>
        No barcode appeared at more than one location in this sample. This does
        not establish a complete comparable basket, and is not a comprehensive
        Paris price audit.
      </p>
      <p>
        <a href={report.queries[0]} target="_blank" rel="noreferrer">
          Exact source query ↗
        </a>{" "}
        ·{" "}
        <a href={appPath("/data/open-prices-coverage.json")} download>
          Download coverage report
        </a>
      </p>
    </div>
  );
}
