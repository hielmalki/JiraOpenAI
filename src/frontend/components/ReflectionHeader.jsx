import React from 'react';
import { Box, Heading, Inline, Lozenge, PieChart, Stack, Text, Tooltip } from '@forge/react';

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

const indicatorWrapperStyles = {
    minWidth: '88px'
};

const buildMonthlyUsageModel = usage => {
    const monthly = usage?.installation?.monthly;

    if (!monthly) {
        return null;
    }

    const limit = Math.max(1, Number(monthly.limit) || 1);
    const count = Math.max(0, Number(monthly.count) || 0);
    const percent = Math.min(100, Math.round((count / limit) * 100));
    const remaining = Math.max(0, limit - count);

    return {
        count,
        limit,
        percent,
        remaining,
        colorToken: percent > 80 ? 'color.chart.orange.bold' : 'color.chart.neutral'
    };
};

const buildUsageTooltipText = usage => {
    const monthlyModel = buildMonthlyUsageModel(usage);
    const daily = usage?.installation?.daily;
    const hourly = usage?.currentUser?.hourly;

    if (!monthlyModel || !daily || !hourly) {
        return '';
    }

    return [
        'Nutzung',
        '',
        'Monat:',
        `${monthlyModel.count} / ${monthlyModel.limit} (${monthlyModel.percent}%)`,
        '',
        'Heute:',
        `${daily.count} / ${daily.limit}`,
        '',
        'Stunde:',
        `${hourly.count} / ${hourly.limit}`
    ].join('\n');
};

const UsageIndicator = ({ usage }) => {
    const monthlyModel = buildMonthlyUsageModel(usage);
    const tooltipText = buildUsageTooltipText(usage);

    if (!monthlyModel || !tooltipText) {
        return null;
    }

    const chartData = [
        {
            label: 'Verwendet',
            value: monthlyModel.count
        },
        {
            label: 'Verbleibend',
            value: monthlyModel.remaining
        }
    ];

    return (
        <Tooltip text={tooltipText}>
            <Box xcss={indicatorWrapperStyles}>
                <PieChart
                    data={chartData}
                    width={72}
                    height={72}
                    isDonut
                    showBorder={false}
                    colorAccessor="label"
                    valueAccessor="value"
                    labelAccessor="label"
                    title={`${monthlyModel.percent}%`}
                    subtitle={`${monthlyModel.count} / ${monthlyModel.limit}`}
                    colors={[monthlyModel.colorToken, 'color.chart.gray.bold']}
                />
            </Box>
        </Tooltip>
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
