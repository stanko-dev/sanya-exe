export function selectFinalPhotos(paths) {
  return paths.map(path => path.replace('/public/media/', ''))
    .filter(path => /^final\/[^/]+\.(jpg|jpeg|png)$/i.test(path) && !/^final\/main\.(jpg|jpeg|png)$/i.test(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
