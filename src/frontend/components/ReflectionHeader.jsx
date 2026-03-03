import React from 'react';
import { Box, Heading, Inline, Lozenge, Stack, Text } from '@forge/react';

const heroStyles = {
    paddingBlock: 'space.100'
};

const scoreLabelStyles = {
    color: 'color.text.subtle'
};

const scoreValueStyles = {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: '1'
};

const ReflectionHeader = ({ averageScore, statusLabel, isReady }) => (
    <Box xcss={heroStyles}>
        <Inline spread="space-between" alignBlock="start" shouldWrap rowSpace="space.150">
            <Stack space="space.100">
                <Inline space="space.100" alignBlock="center" shouldWrap>
                    <Heading as="h3">Insight Dashboard</Heading>
                    <Lozenge>{statusLabel}</Lozenge>
                </Inline>
                <Text>AI-basierte Qualitätsreflexion für Verständlichkeit, Konsistenz und Business Value.</Text>
            </Stack>

            <Stack alignInline="end" space="space.050">
                <Box xcss={scoreLabelStyles}>
                    <Text>Durchschnittsscore</Text>
                </Box>
                <Box xcss={scoreValueStyles}>
                    <Text>{isReady ? `${averageScore}/10` : '--'}</Text>
                </Box>
            </Stack>
        </Inline>
    </Box>
);

export default ReflectionHeader;
