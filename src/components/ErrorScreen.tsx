/** `GameLoader.ShowError` (`GameLoader.cs:473-488`, spec §7) — a fatal boot
 * error tints an outline red and shows the message; there's no retry, the
 * source's only recovery path is a full relaunch. */
export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="error-screen">
      <div className="error-panel">
        <p className="error-message">{message}</p>
      </div>
    </div>
  );
}
