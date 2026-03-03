import React from 'react';
import { Box, Heading, Inline, Lozenge, Stack, Text } from '@forge/react';

const heroStyles = {
    paddingBlock: 'space.100'
};

const scoreLabelStyles = {
    color: 'color.text.subtle'
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
                <Heading as="h2">{isReady ? `${averageScore}/10` : '--'}</Heading>
            </Stack>
        </Inline>
    </Box>
);

export default ReflectionHeader;
