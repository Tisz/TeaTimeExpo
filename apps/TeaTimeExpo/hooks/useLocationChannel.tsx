import * as Location from 'expo-location';
import { useUploadLocationMutation, getMockLocation } from '../redux/api/locationAPI';
import { useDispatch } from 'react-redux';
import { setChannelName } from '../redux/slices/chatSlice';

export function useLocationChannel() {
  const [uploadLocation, { isLoading, error }] = useUploadLocationMutation();
  const dispatch = useDispatch();

  const requestAndUpload = async () => {

    //Check for permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        return;
    }

    const { coords } = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = coords;

    const res = await uploadLocation({ latitude, longitude }).unwrap();

    dispatch(setChannelName(res.channelId));
  };

  return { requestAndUpload, isLoading, error };
}