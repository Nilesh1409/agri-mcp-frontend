"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Globe } from "lucide-react";

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: {
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
  };
  onLocationChange: (location: {
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
  }) => void;
}

const commonLocations = {
  "Mumbai, India": { lat: 19.076, lon: 72.8777 },
  "Delhi, India": { lat: 28.6139, lon: 77.209 },
  "Bangalore, India": { lat: 12.9716, lon: 77.5946 },
  "New York, USA": { lat: 40.7128, lon: -74.006 },
  "London, UK": { lat: 51.5074, lon: -0.1278 },
  "Tokyo, Japan": { lat: 35.6762, lon: 139.6503 },
  "Sydney, Australia": { lat: -33.8688, lon: 151.2093 },
  "Paris, France": { lat: 48.8566, lon: 2.3522 },
  "Berlin, Germany": { lat: 52.52, lon: 13.405 },
  "Moscow, Russia": { lat: 55.7558, lon: 37.6176 },
};

export function LocationDialog({
  open,
  onOpenChange,
  location,
  onLocationChange,
}: LocationDialogProps) {
  const [latitude, setLatitude] = useState(location.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(
    location.longitude?.toString() || ""
  );
  const [locationName, setLocationName] = useState(location.locationName || "");
  const [error, setError] = useState("");

  // Geolocation helper
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const name = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        onLocationChange({ latitude: lat, longitude: lon, locationName: name });
        onOpenChange(false);
      },
      (e) => setError("Permission denied or unavailable")
    );
  };

  const handleCoordinatesSubmit = () => {
    setError("");
    const lat = Number.parseFloat(latitude);
    const lon = Number.parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) return setError("Enter valid numbers");
    if (lat < -90 || lat > 90) return setError("Latitude must be -90 to 90");
    if (lon < -180 || lon > 180) return setError("Longitude -180 to 180");
    const name = locationName.trim() || `${lat}, ${lon}`;
    onLocationChange({ latitude: lat, longitude: lon, locationName: name });
    onOpenChange(false);
  };

  const handleLocationSelect = (
    name: string,
    coords: { lat: number; lon: number }
  ) => {
    onLocationChange({
      latitude: coords.lat,
      longitude: coords.lon,
      locationName: name,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" /> Set Your Location
          </DialogTitle>
          <DialogDescription>
            I need your location to provide accurate environmental data.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="space-y-4 mt-4">
          <Tabs defaultValue="coordinates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="coordinates">Coordinates</TabsTrigger>
              <TabsTrigger value="cities">Common Cities</TabsTrigger>
            </TabsList>

            <TabsContent value="coordinates" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  placeholder="e.g., 12.9716"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  placeholder="e.g., 77.5946"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationName">Location Name (Optional)</Label>
                <Input
                  id="locationName"
                  placeholder="e.g., My Farm"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
              <Button onClick={handleCoordinatesSubmit} className="w-full">
                Set Location
              </Button>
              <div className="mt-2">
                <Button
                  className="w-full border border-black"
                  // size=""
                  variant="secondary"
                  onClick={useCurrentLocation}
                >
                  Use Current Location
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="cities" className="space-y-2">
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {Object.entries(commonLocations).map(([name, coords]) => (
                  <Button
                    key={name}
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleLocationSelect(name, coords)}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    {name}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
