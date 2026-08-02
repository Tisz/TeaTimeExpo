import React, {useCallback, useState} from 'react';
import MainContainer from '../components/Containers/MainContainer';
import BigText from '../components/Texts/BigText';
import BoolSettingsCard from '../components/Cards/BoolSettingsCard'
import SingleValueSettingsCard from '../components/Cards/SingleValueSettingCard';
import styled from 'styled-components/native'
import { Switch } from 'react-native';
import { ScreenHeight } from '../components/shared';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { toggleTheme } from '../redux/slices/settingsSlice';

const TopBackground = styled.View`
    background-color: ${(props) => props.theme.darkGrey};
    width: 100%;
    height: ${ScreenHeight * 0.15}px;
    border-radius: 30px;
    position: absolute;
    top: -30px;
    `;


const NotificationSettings = () => {
    const isDarkTheme = useSelector((state: RootState) => state.setting.isDarkMode);
    const appDispatch = useDispatch<AppDispatch>();

    const [alertsOn, setAlertsOn] = useState(false);
    const [messageAmountAlert, setMessageAmountAlert] = useState(false);
    const [messageAlertAmount, setMessageAlertAmount] = useState(false);

    const handleToggleTheme = useCallback(() => {
        appDispatch(toggleTheme());
      }, [appDispatch]);

    return <MainContainer style={{paddingTop: 0, paddingLeft: 0, paddingRight: 0}}>
        <TopBackground/>
        <MainContainer style={{backgroundColor: 'transparent'}}>
            <BigText style={{marginBottom: 40, fontWeight: 'bold' }}>Notification Settings</BigText>
            <BoolSettingsCard icon="bell-check" title="Enable Notifications" value={alertsOn} onValueChange={() => setAlertsOn((alertsOn) => !alertsOn)} style={{marginBottom: 25}}/>
            <BoolSettingsCard icon="moon-waxing-crescent" title="Dark Mode" value={isDarkTheme} onValueChange={handleToggleTheme} style={{marginBottom: 25}}/>
            <SingleValueSettingsCard icon="card-account-mail-outline" title="Message Alert" valueDescription="Message Amount"
                value={messageAlertAmount} onValueChange={setMessageAlertAmount}
                showBoolValue={true} boolValue={messageAmountAlert} 
                onBoolValueChange={() => setMessageAmountAlert((refundLimitAmount) => !refundLimitAmount)} style={{marginBottom: 25}}/>


        </MainContainer>
    </MainContainer>
}

export default NotificationSettings;