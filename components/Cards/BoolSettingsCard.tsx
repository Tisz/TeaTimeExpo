import React from 'react';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Switch} from 'react-native'

// styled components
import styled from 'styled-components/native'
import { ScreenHeight, StatusBarHeight } from '../shared';
import { colors } from '../colors';
import RegularText from '../Texts/RegularText';
import SmallText from '../Texts/SmallText';
const { primary, secondary, black, accent } = colors;

const BoolSettingsCardView = styled.View`
    flex-direction: row;
    height: ${ScreenHeight * 0.1}px;
    background-color: ${primary};
    border-width: 2px;
    border-color: ${secondary};
    padding: 10px;
    border-radius: 15px;
    overflow: hidden;
    elevation: 5;
    shadow-color: ${black};
    shadow-offset: 0px 2px;
    shadow-opacity: 0.25;
    shadow-radius: 4px;
    `;

const OptionsSelection = styled.View`
    justify-content: space-between;
    align-items: flex-start;
    `

const BoolSettingsCard = ({icon, title, value, onValueChange, color = accent, ...props}) => {
    return <BoolSettingsCardView style={{...props?.style}}>
            <OptionsSelection style={{width: '25%'}}>
                <MaterialCommunityIcons name={icon} size={ScreenHeight * 0.07} color={color ? color : accent}/>
            </OptionsSelection>

            <OptionsSelection style={{width: '60%'}}>
                
                <RegularText style={{fontWeight: 'bold', fontSize: 18, marginTop: 13}}>
                    {title}
                </RegularText>


            </OptionsSelection>

            <Switch value={value} onValueChange={onValueChange}/>

        </BoolSettingsCardView>
}

export default BoolSettingsCard;