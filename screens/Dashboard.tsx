import React from 'react';
import { colors } from '../components/colors';
const {darkGrey} = colors

//custom components
import MainContainer from '../components/Containers/MainContainer';
import BigText from '../components/Texts/BigText';
import InfoCard from '../components/Cards/InfoCard';

// styled components
import styled from 'styled-components/native'
import { ScreenHeight } from '../components/shared';

const TopBackground = styled.View`
    background-color: ${darkGrey};
    width: 100%;
    height: ${ScreenHeight * 0.3}px;
    border-radius: 30px;
    position: absolute;
    top: -30px;
    `;


const Dashboard = () => {
    return <MainContainer style={{paddingTop: 0, paddingLeft: 0, paddingRight: 0}}>
        <TopBackground/>
        <MainContainer style={{backgroundColor: 'transparent'}}>
            <BigText style={{marginBottom: 25, fontWeight: 'bold' }}>Hello Rhys</BigText>
            <InfoCard icon="cash-register" title="Daily Takings" value="$25,950.27" date="21/10/2023" style={{marginBottom: 25}}/>
            <InfoCard icon="pill" title="Script Sales" value="73" date="21/10/2023" style={{marginBottom: 25}}/>
        </MainContainer>
    </MainContainer>
}

export default Dashboard;