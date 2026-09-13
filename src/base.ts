const configuredBase = import.meta.env.BASE_URL.replace(/\/+$/, "");

export function appPath(path = "/") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${configuredBase}${suffix}` || "/";
}

export function relativeAppPath(pathname = window.location.pathname) {
  if (configuredBase && pathname.startsWith(configuredBase)) {
    return pathname.slice(configuredBase.length) || "/";
  }
  return pathname || "/";
}
