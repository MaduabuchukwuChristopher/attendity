export function currentPosition(
  required: boolean,
): Promise<{ latitude: number; longitude: number; accuracy: number } | undefined> {
  if (!required) return Promise.resolve(undefined);
  if (!('geolocation' in navigator))
    return Promise.reject(new Error('This device does not support location verification.'));
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => reject(new Error('Allow precise location access to complete this check-in.')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
    ),
  );
}
