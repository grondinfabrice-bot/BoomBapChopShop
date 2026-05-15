export function Toast(message) {
  return `<div class="toast ${message ? "show" : ""}" role="status">${message || ""}</div>`;
}
