import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./baseQuery";

type LocationPayload = { latitude: number; longitude: number };
export type LocationResponse = {
  roomId: string;
  suburb: string;
  state: string;
  country: string;
};

export const getMockLocation = (): number => {
  return 1;
};

export const locationApi = createApi({
  reducerPath: "locationApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    uploadLocation: builder.mutation<LocationResponse, LocationPayload>({
      query: (coords) => ({
        url: "/location",
        method: "POST",
        body: coords,
      }),
    }),
  }),
});

export const { useUploadLocationMutation } = locationApi;
