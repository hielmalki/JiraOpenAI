import React from 'react';
import { Box, Button, Heading, Inline, Lozenge, Popup, Stack, Strong, Text } from '@forge/react';

const heroStyles = {
    paddingBlock: 'space.100'
};

const scoreLabelStyles = {
    color: 'color.text.subtle'
};

const metadataColumnStyles = {
    minWidth: '160px'
};

const scoreCardStyles = {
    paddingBlock: 'space.025'
};

const usageIndicatorStyles = {
    paddingInline: 'space.100',
    paddingBlock: 'space.050',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.neutral.subtle'
};

const usageIndicatorWarningStyles = {
    paddingInline: 'space.100',
    paddingBlock: 'space.050',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.warning'
};

const usagePopupStyles = {
    padding: 'space.125',
    borderRadius: 'border.radius',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border',
    backgroundColor: 'color.background.neutral.subtle'
};

const usagePopupTextStyles = {
    color: 'color.text'
};

const buildMonthlyUsageModel = usage => {
    const monthly = usage?.installation?.monthly;

    if (!monthly) {
        return null;
    }

    const limit = Math.max(1, Number(monthly.limit) || 1);
    const count = Math.max(0, Number(monthly.count) || 0);
    const percent = Math.min(100, Math.round((count / limit) * 100));

    return {
        count,
        limit,
        percent,
        isWarning: percent > 80
    };
};

const buildUsageDetails = usage => {
    const monthlyModel = buildMonthlyUsageModel(usage);
    const daily = usage?.currentUser?.daily;
    const hourly = usage?.currentUser?.hourly;

    if (!monthlyModel || !daily || !hourly) {
        return null;
    }

    return {
        monthlyModel,
        daily,
        hourly
    };
};

const UsageIndicator = ({ usage }) => {
    const monthlyModel = buildMonthlyUsageModel(usage);
    const details = buildUsageDetails(usage);
    const [isOpen, setIsOpen] = React.useState(false);

    if (!monthlyModel || !details) {
        return null;
    }

    return (
        <Popup
            isOpen={isOpen}
            placement="top"
            onClose={() => setIsOpen(false)}
            content={() => (
                <Box xcss={usagePopupStyles}>
                    <Box xcss={usagePopupTextStyles}>
                        <Stack space="space.050">
                            <Text>
                                <Strong>Nutzung</Strong>
                            </Text>
                            <Text>{`Monat: ${details.monthlyModel.count} / ${details.monthlyModel.limit} (${details.monthlyModel.percent}%)`}</Text>
                            <Text>{`Heute: ${details.daily.count} / ${details.daily.limit}`}</Text>
                            <Text>{`Stunde: ${details.hourly.count} / ${details.hourly.limit}`}</Text>
                        </Stack>
                    </Box>
                </Box>
            )}
            trigger={() => (
                <Button
                    appearance="subtle"
                    spacing="none"
                    onClick={() => setIsOpen(previous => !previous)}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                >
                    {`Nutzung ${monthlyModel.percent}%`}
                </Button>
            )}
        />
    );
};

const ReflectionHeader = ({ averageScore, statusLabel, isReady, usage }) => (
    <Box xcss={heroStyles}>
        <Inline spread="space-between" alignBlock="start" shouldWrap rowSpace="space.150">
            <Stack space="space.100">
                <Inline space="space.100" alignBlock="center" shouldWrap>
                    <Heading as="h3">Insight Dashboard</Heading>
                    <Lozenge>{statusLabel}</Lozenge>
                    <UsageIndicator usage={usage} />
                </Inline>
                <Text>AI-basierte Qualitätsreflexion für Verständlichkeit, Konsistenz und Business Value.</Text>
            </Stack>

            <Stack alignInline="end" space="space.025" xcss={metadataColumnStyles}>
                <Box xcss={scoreCardStyles}>
                    <Box xcss={scoreLabelStyles}>
                        <Text>Durchschnittsscore</Text>
                    </Box>
                </Box>
                <Heading as="h2">{isReady ? `${averageScore}/10` : '--'}</Heading>
            </Stack>
        </Inline>
    </Box>
);

export default ReflectionHeader;
