const registrationScript = `
(() => {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      await registration.update();
    } catch (error) {
      console.error("Service worker registration failed", error);
    }
  };

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", register, { once: true });
})();
`

export function PWARegister() {
  return (
    <script
      id="daaysorn-pwa-register"
      dangerouslySetInnerHTML={{ __html: registrationScript }}
    />
  )
}
