import React from 'react';
import { Badge, Box, Inline, Stack, Text } from '@forge/react';

const rowStyles = {
    paddingBlock: 'space.125'
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
            barColor: 'color.background.danger.bold',
            toneLabel: 'Kritisch'
        };
    }
    if (score < 8) {
        return {
            barColor: 'color.background.warning.bold',
            toneLabel: 'Solide'
        };
    }
    return {
        barColor: 'color.background.success.bold',
        toneLabel: 'Stark'
    };
};

const ScoreRow = ({ label, score, feedback }) => {
    const safeScore = Math.max(1, Math.min(10, Number(score) || 0));
    const progress = `${safeScore * 10}%`;
    const tone = getScoreAppearance(safeScore);
    const barFillStyles = {
        width: progress,
        height: '8px',
        backgroundColor: tone.barColor,
        borderRadius: 'border.radius'
    };

    return (
        <Box xcss={rowStyles}>
            <Stack space="space.100">
                <Inline spread="space-between" alignBlock="center">
                    <Text>{label}</Text>
                    <Badge>{safeScore}/10</Badge>
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
