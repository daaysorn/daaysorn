const registrationScript = `
(() => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__daaysornInstallPrompt = event;
    window.dispatchEvent(new Event("daaysorn:installable"));
  });

  window.addEventListener("appinstalled", () => {
    window.__daaysornInstallPrompt = null;
    window.dispatchEvent(new Event("daaysorn:installed"));
  });

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

      if ("periodicSync" in registration) {
        try {
          await registration.periodicSync.register("daaysorn-daily-content-refresh", {
            minInterval: 24 * 60 * 60 * 1000,
          });
        } catch {
          // The browser may withhold periodic sync until the app has enough engagement.
        }
      }

      const requestRecoverySync = async () => {
        if (!("sync" in registration)) return;
        try {
          await registration.sync.register("daaysorn-refresh-offline-content");
        } catch {
          // Online/focus refresh remains the cross-browser fallback.
        }
      };

      if (!navigator.onLine) {
        window.addEventListener("online", requestRecoverySync, { once: true });
      }
      window.addEventListener(
        "offline",
        () => window.addEventListener("online", requestRecoverySync, { once: true }),
        { passive: true }
      );
    } catch (error) {
      console.error("Service worker registration failed", error);
    }
  };

  void register();
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
