import React, {useState} from 'react';
import { colors } from '../components/colors';
const {darkGrey} = colors

//custom components
import MainContainer from '../components/Containers/MainContainer';
import BigText from '../components/Texts/BigText';

// styled components
import styled from 'styled-components/native'
import { ScreenHeight } from '../components/shared';
import StyledTextInput from '../components/Inputs/StyledTextInput';
import NotificationItemCard from '../components/Cards/NotificationItemCard';

const TopBackground = styled.View`
    background-color: ${darkGrey};
    width: 100%;
    height: ${ScreenHeight * 0.15}px;
    border-radius: 30px;
    position: absolute;
    top: -30px;
    `;


const Notifications = () => {

    const toNotificationItem = (value, index) => {
        return (
            <NotificationItemCard icon="cash-register" title="Daily Takings" value="$25,950.27" date="21/10/2023" style={{marginBottom: 25}}/>
        );
    };

    return <MainContainer style={{paddingTop: 0, paddingLeft: 0, paddingRight: 0}}>
        <TopBackground/>
        <MainContainer style={{backgroundColor: 'transparent'}}>
        {/* to-do: get this list working
         <ScrollView>
            <View>
                { Notifications.map(toCodeDigitInput) }
            </View>
        </ScrollView> */}

        </MainContainer>
    </MainContainer>
}

export default Notifications;