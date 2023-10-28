import React from 'react';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Switch, View} from 'react-native'

// styled components
import styled from 'styled-components/native'
import { ScreenHeight, StatusBarHeight } from '../shared';
import { colors } from '../colors';
import RegularText from '../Texts/RegularText';
import SmallText from '../Texts/SmallText';
import StyledTextInput from '../Inputs/StyledTextInput';
import SmallStyledTextInput from '../Inputs/SmallStyledTextInput';
const { primary, secondary, black, accent, lightGrey } = colors;

const ValueSettingsCardView = styled.View`
    flex-direction: row;
    height: ${ScreenHeight * 0.25}px;
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


const HorizontalView = styled.View`
    flex-direction: row;
    justify-content: space-evenly;
    align-items: flex-start;
    `;

const OptionsSelection = styled.View`
    justify-content: space-between;
    align-items: flex-start;
    `

const SingleValueSettingsCard = ({icon, title, value, onValueChange, valueDescription, showBoolValue = false, boolValue, onBoolValueChange, color = accent, ...props}) => {
    return <ValueSettingsCardView style={{...props?.style}}>
            <OptionsSelection style={{width: '25%', marginTop: 13}}>
                <MaterialCommunityIcons name={icon} size={ScreenHeight * 0.07} color={color ? color : accent}/>
            </OptionsSelection>

            <OptionsSelection style={{width: '85%'}}>
                <HorizontalView>
                    <RegularText style={{fontWeight: 'bold', fontSize: 18, marginTop: 13}}>
                        {title}
                    </RegularText>

                    {showBoolValue && 
                        (
                            <Switch value={boolValue} onValueChange={onBoolValueChange} style={{marginTop: 3}}/>
                        ) 
                    }
                </HorizontalView>

                <View
                    style={{
                        borderBottomColor: lightGrey,
                        borderBottomWidth: 1,
                        width: '75%'
                    }}
                />

                <RegularText style={{fontWeight: 'bold', fontSize: 18, marginTop: 13}}>
                        {valueDescription}
                </RegularText>

                <SmallStyledTextInput 
                            label="" 
                            placeholder="$0.00" 
                            keyboardType="decimal-pad"
                            icon={"currency-usd"}
                            overrideHeight={40}
                            overrideFontSize={10}
                            style={{marginBottom: 25}}
                        />
            </OptionsSelection>


        </ValueSettingsCardView>
}

export default SingleValueSettingsCard;