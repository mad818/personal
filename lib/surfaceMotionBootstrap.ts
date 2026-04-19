const SETTINGS_STORAGE_KEY = "nexus-settings";

export function buildSurfaceMotionBootstrapScript() {
  return `
    (function () {
      try {
        var root = document.documentElement;
        var path = window.location.pathname || "/";
        var section = path.replace(/^\\//, "").split("/")[0] || "";
        var surface = "default";

        if (path === "/" || section === "home" || section === "hq") surface = "hq";
        else if (section === "command") surface = "command";
        else if (section === "intel") surface = "intel";
        else if (section === "alpha") surface = "alpha";
        else if (section === "cyber" || section === "security") surface = "cyber";
        else if (section === "recon") surface = "recon";
        else if (section === "vault") surface = "vault";
        else if (section === "resources" || section === "skills") surface = "resources";
        else if (section === "vehicle") surface = "vehicle";

        var ingress = "ceremonial";
        if (surface === "command" || surface === "alpha" || surface === "vehicle") ingress = "tactical";
        else if (surface === "intel" || surface === "recon") ingress = "scan";
        else if (surface === "cyber" || surface === "vault") ingress = "sealed";
        else if (surface === "resources") ingress = "manual";

        var profile = "flagship";
        try {
          var raw = window.localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)});
          if (raw) {
            var parsed = JSON.parse(raw);
            var persisted =
              parsed &&
              parsed.state &&
              parsed.state.settings &&
              parsed.state.settings.surfaceMotionProfile;
            if (
              persisted === "reduced" ||
              persisted === "standard" ||
              persisted === "flagship"
            ) {
              profile = persisted;
            }
          }
        } catch (_error) {
          profile = "flagship";
        }

        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          profile = "reduced";
        }

        root.dataset.nexusSurface = surface;
        root.dataset.nexusIngress = ingress;
        root.dataset.nexusMotionProfile = profile;
      } catch (_error) {
        // silent
      }
    })();
  `;
}
