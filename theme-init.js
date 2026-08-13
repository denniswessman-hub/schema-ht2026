(() => {
  const storageKey = "schemaHT26.theme";
  let theme;

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark") theme = stored;
  } catch {
    // Systemets färginställning används om lokal lagring inte är tillgänglig.
  }

  if (!theme) theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
