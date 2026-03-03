import React from 'react';
import { Badge, Box, Heading, Inline, Lozenge, Stack, Text } from '@forge/react';

const heroStyles = {
    paddingBlock: 'space.150'
};

const scoreCardStyles = {
    padding: 'space.150',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.neutral',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border'
};

const subtitleStyles = {
    maxWidth: '560px'
};

const ReflectionHeader = ({ averageScore, statusLabel, isReady }) => (
    <Box xcss={heroStyles}>
        <Inline spread="space-between" alignBlock="start" shouldWrap rowSpace="space.150">
            <Stack space="space.100">
                <Inline space="space.100" alignBlock="center" shouldWrap>
                    <Heading as="h3">Reflection</Heading>
                    <Lozenge>{statusLabel || 'NICHT VERFÜGBAR'}</Lozenge>
                </Inline>
                <Box xcss={subtitleStyles}>
                    <Text>AI-basierte Qualitätsreflexion für Verständlichkeit, Konsistenz und Business Value.</Text>
                </Box>
            </Stack>

            <Box xcss={scoreCardStyles}>
                <Stack alignInline="end" space="space.050">
                    <Text>Durchschnittsscore</Text>
                    <Badge>{isReady ? `${averageScore}/10` : '-'}</Badge>
                </Stack>
            </Box>
        </Inline>
    </Box>
);

export default ReflectionHeader;
