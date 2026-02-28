"use client";

import { City, Country, State } from "country-state-city";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Location Selector Component
const LocationSelector = ({
  value,
  onChange,
}: {
  value: { country: string; state: string; city: string };
  onChange: (v: { country: string; state: string; city: string }) => void;
}) => {
  const { country, state, city } = value;

  const countries = useMemo(() => Country.getAllCountries(), []);

  const [states, setStates] = useState<{ name: string; isoCode: string }[]>([]);
  const [cities, setCities] = useState<{ name: string }[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const debouncedCountrySearch = useDebounce(countrySearch, 300);
  const debouncedStateSearch = useDebounce(stateSearch, 300);
  const debouncedCitySearch = useDebounce(citySearch, 300);

  const filteredCountries = useMemo(
    () =>
      countries.filter((c) =>
        c.name.toLowerCase().includes(debouncedCountrySearch.toLowerCase())
      ),
    [countries, debouncedCountrySearch]
  );

  const filteredStates = useMemo(
    () =>
      states.filter((s) =>
        s.name.toLowerCase().includes(debouncedStateSearch.toLowerCase())
      ),
    [states, debouncedStateSearch]
  );

  const filteredCities = useMemo(
    () =>
      cities.filter((c) =>
        c.name.toLowerCase().includes(debouncedCitySearch.toLowerCase())
      ),
    [cities, debouncedCitySearch]
  );

  useEffect(() => {
    if (country) {
      const newStates = State.getStatesOfCountry(country);
      setStates(newStates);
    } else {
      setStates([]);
    }
    setCities([]);
    setStateSearch("");
    setCitySearch("");
  }, [country]);

  useEffect(() => {
    if (country && state) {
      const newCities = City.getCitiesOfState(country, state);
      setCities(newCities);
    } else {
      setCities([]);
    }
    setCitySearch("");
  }, [country, state]);

  const handleCountryChange = useCallback(
    (v: string) => {
      onChange({ country: v, state: "", city: "" });
    },
    [onChange]
  );

  const handleStateChange = useCallback(
    (v: string) => {
      onChange({ country, state: v, city: "" });
    },
    [onChange, country]
  );

  const handleCityChange = useCallback(
    (v: string) => {
      onChange({ country, state, city: v });
    },
    [onChange, country, state]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <div>
        <Label>Country *</Label>
        <Select value={country} onValueChange={handleCountryChange}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1">
              <Input
                placeholder="Type to filter country"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="mb-2"
              />
            </div>
            {filteredCountries.map((c) => (
              <SelectItem key={c.isoCode} value={c.isoCode}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>State *</Label>
        <Select
          value={state}
          onValueChange={handleStateChange}
          disabled={!country}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1">
              <Input
                placeholder="Type to filter state"
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                className="mb-2"
                disabled={!country}
              />
            </div>
            {filteredStates.map((s) => (
              <SelectItem key={s.isoCode} value={s.isoCode}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>City *</Label>
        <Select value={city} onValueChange={handleCityChange} disabled={!state}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1">
              <Input
                placeholder="Type to filter city"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="mb-2"
                disabled={!state}
              />
            </div>
            {filteredCities.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default LocationSelector;
