type StaticMapFallbackProps = {
  token: string;
  center: [number, number];
  zoom: number;
};

export function StaticMapFallback({ token, center, zoom }: StaticMapFallbackProps) {
  const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${center[0]},${center[1]},${zoom},0/1280x800@2x?access_token=${token}`;
  return (
    <img src={url} alt="Map" className="h-full w-full object-cover" />
  );
}
