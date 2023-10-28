import React, {useState} from 'react';
import { colors } from '../components/colors';
const {darkGrey} = colors

//custom components
import MainContainer from '../components/Containers/MainContainer';
import BigText from '../components/Texts/BigText';
import BoolSettingsCard from '../components/Cards/BoolSettingsCard'
import SingleValueSettingsCard from '../components/Cards/SingleValueSettingCard';

// styled components
import styled from 'styled-components/native'
import { ScreenHeight } from '../components/shared';

const TopBackground = styled.View`
    background-color: ${darkGrey};
    width: 100%;
    height: ${ScreenHeight * 0.15}px;
    border-radius: 30px;
    position: absolute;
    top: -30px;
    `;


const NotificationSettings = () => {
    const [alertsOn, setAlertsOn] = useState(false);
    const [refundLimitAlert, setRefundLimitAlert] = useState(false);
    const [refundLimitAmount, setRefundLimitAmount] = useState(false);

    return <MainContainer style={{paddingTop: 0, paddingLeft: 0, paddingRight: 0}}>
        <TopBackground/>
        <MainContainer style={{backgroundColor: 'transparent'}}>
            <BigText style={{marginBottom: 40, fontWeight: 'bold' }}>Notification Settings</BigText>
            <BoolSettingsCard icon="bell-check" title="Enable Notifications" value={alertsOn} onValueChange={() => setAlertsOn((alertsOn) => !alertsOn)} style={{marginBottom: 25}}/>
            <SingleValueSettingsCard icon="cash-refund" title="Refund Alert" valueDescription="Refund Alert Amount"
                value={refundLimitAmount} onValueChange={setRefundLimitAmount}
                showBoolValue={true} boolValue={refundLimitAlert} 
                onBoolValueChange={() => setRefundLimitAlert((refundLimitAmount) => !refundLimitAmount)} style={{marginBottom: 25}}/>
        </MainContainer>
    </MainContainer>
}

export default NotificationSettings;