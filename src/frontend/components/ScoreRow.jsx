import React from 'react';
import { Box, Inline, Stack, Strong, Text } from '@forge/react';

const rowStyles = {
    paddingBlock: 'space.075'
};

const barTrackStyles = {
    width: '100%',
    height: '8px',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.neutral.subtle',
    overflow: 'hidden'
};

const feedbackStyles = {
    color: 'color.text.subtle'
};

export const getScoreAppearance = score => {
    if (score < 6) {
        return {
            barColor: '#FF2C2C',
            toneLabel: 'Kritisch'
        };
    }
    if (score < 8) {
        return {
            barColor: '#FFDE21',
            toneLabel: 'Solide'
        };
    }
    return {
        barColor: '#50C878',
        toneLabel: 'Stark'
    };
};

const ScoreRow = ({ label, score, feedback }) => {
    const safeScore = Math.max(1, Math.min(10, Number(score) || 0));
    const tone = getScoreAppearance(safeScore);
    const barFillStyles = {
        width: `${safeScore * 10}%`,
        height: '8px',
        backgroundColor: tone.barColor,
        borderRadius: 'border.radius'
    };

    return (
        <Box xcss={rowStyles}>
            <Stack space="space.050">
                <Inline spread="space-between" alignBlock="center">
                    <Text>
                        <Strong>{label}</Strong>
                    </Text>
                    <Text>
                        <Strong>{`${safeScore}/10`}</Strong>
                    </Text>
                </Inline>

                <Box xcss={barTrackStyles}>
                    <Box xcss={barFillStyles} />
                </Box>

                <Box xcss={feedbackStyles}>
                    <Text>{`${tone.toneLabel}: ${feedback}`}</Text>
                </Box>
            </Stack>
        </Box>
    );
};

export default ScoreRow;
