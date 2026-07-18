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

const developmentCleanupScript = `
(() => {
  if (!("serviceWorker" in navigator)) return;

  const cleanup = async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("daaysorn-"))
          .map((key) => caches.delete(key))
      );
    }

    if (navigator.serviceWorker.controller && !sessionStorage.getItem("daaysorn-dev-sw-cleared")) {
      sessionStorage.setItem("daaysorn-dev-sw-cleared", "true");
      window.location.reload();
    }
  };

  void cleanup();
})();
`

export function PWARegister() {
  return (
    <script
      id="daaysorn-pwa-register"
      dangerouslySetInnerHTML={{
        __html:
          process.env.NODE_ENV === "production"
            ? registrationScript
            : developmentCleanupScript,
      }}
    />
  )
}
