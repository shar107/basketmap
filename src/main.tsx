import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/app.css";
class Boundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="error-boundary">
        <h1>BasketMap couldn’t load this view.</h1>
        <p>Your basket is saved on this device when storage is available.</p>
        <button onClick={() => location.reload()}>Reload BasketMap</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>,
);
