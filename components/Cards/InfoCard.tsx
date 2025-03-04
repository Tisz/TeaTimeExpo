import React from 'react';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import styled from 'styled-components/native'
import { ScreenHeight, StatusBarHeight } from '../shared';
import RegularText from '../Texts/RegularText';
import SmallText from '../Texts/SmallText';
import { useTheme } from 'styled-components/native';
import { ThemeType } from '../Colors/Colors';

const CardView = styled.View`
    flex-direction: row;
    height: ${ScreenHeight * 0.2}px;
    background-color: ${(props) => props.theme.secondary};
    border-width: 2px;
    border-color: ${(props) => props.theme.accent};
    padding: 20px;
    border-radius: 15px;
    overflow: hidden;
    elevation: 5;
    shadow-color: ${(props) => props.theme.black};
    shadow-offset: 0px 2px;
    shadow-opacity: 0.25;
    shadow-radius: 4px;
    `;

const CardSelection = styled.View`
    justify-content: space-between;
    align-items: flex-start;
    `

const InfoCard = ({icon, title, value, date, color = null, ...props}) => {
    const theme = useTheme() as ThemeType;

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
                <MaterialCommunityIcons name={icon} size={ScreenHeight * 0.13} color={color ? color : theme.accent}/>
            </CardSelection>
        </CardView>
}

export default InfoCard;