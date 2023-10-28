import React from 'react';
import {MaterialCommunityIcons} from '@expo/vector-icons';

// styled components
import styled from 'styled-components/native'
import { ScreenHeight, StatusBarHeight } from '../shared';
import { colors } from '../colors';
import RegularText from '../Texts/RegularText';
import SmallText from '../Texts/SmallText';
const { primary, secondary, black, accent } = colors;

const CardView = styled.View`
    flex-direction: row;
    height: ${ScreenHeight * 0.2}px;
    background-color: ${primary};
    border-width: 2px;
    border-color: ${secondary};
    padding: 20px;
    border-radius: 15px;
    overflow: hidden;
    elevation: 5;
    shadow-color: ${black};
    shadow-offset: 0px 2px;
    shadow-opacity: 0.25;
    shadow-radius: 4px;
    `;

const CardSelection = styled.View`
    justify-content: space-between;
    align-items: flex-start;
    `

const NotificationItemCard = ({icon, title, value, date, color = accent, ...props}) => {
    return <CardView style={{...props?.style}}>
            <CardSelection style={{width: '60%'}}>
                <RegularText style={{fontWeight: 'bold'}}>
                    {title}
                </RegularText>
                <RegularText style={{fontWeight: 'bold', fontSize: 25}}>
                    {value}
                </RegularText>
                <SmallText>
                    {date}
                </SmallText>
            </CardSelection>

            <CardSelection style={{width: '40%'}}>
                <MaterialCommunityIcons name={icon} size={ScreenHeight * 0.13} color={color ? color : accent}/>
            </CardSelection>
        </CardView>
}

export default NotificationItemCard;