<?php

namespace App\Services;

/**
 * Сервис минимизации денежных потоков (Greedy Min Cash Flow Algorithm)
 * Находит минимальное количество прямых транзакций для полного взаиморасчета долгов между всеми участниками.
 */
class MinCashFlowService
{
    /**
     * Рассчитать взаиморасчеты.
     *
     * @param array $participants Список участников [['id' => 1, 'name' => 'Андрей', 'payment_details' => '...'], ...]
     * @param array $expenses     Список расходов с вложенными долями 'splits'
     * @return array              [
     *                              'transactions' => [...],
     *                              'net_balances' => [...],
     *                              'total_spent'  => 12500.00
     *                            ]
     */
    public function calculate(array $participants, array $expenses): array
    {
        $netBalances = [];
        $participantMap = [];
        $totalSpent = 0.0;

        foreach ($participants as $p) {
            $id = (int)$p['id'];
            $netBalances[$id] = 0.0;
            $participantMap[$id] = [
                'id' => $id,
                'name' => $p['name'],
                'payment_details' => $p['payment_details'] ?? null,
                'telegram_id' => $p['telegram_id'] ?? null,
            ];
        }

        // Подсчет чистого баланса каждого участника
        foreach ($expenses as $expense) {
            $amount = (float)$expense['amount'];
            $totalSpent += $amount;
            $payerId = (int)$expense['payer_id'];

            if (isset($netBalances[$payerId])) {
                $netBalances[$payerId] += $amount;
            }

            if (!empty($expense['splits']) && is_array($expense['splits'])) {
                foreach ($expense['splits'] as $split) {
                    $splitParticipantId = (int)$split['participant_id'];
                    $shareAmount = (float)$split['share_amount'];

                    if (isset($netBalances[$splitParticipantId])) {
                        $netBalances[$splitParticipantId] -= $shareAmount;
                    }
                }
            }
        }

        // Округляем балансы до 2 знаков для исключения погрешностей чисел с плавающей точкой
        $formattedBalances = [];
        $debtors = [];   // баланс < 0 (должны отдать)
        $creditors = []; // баланс > 0 (должны получить)

        foreach ($netBalances as $id => $balance) {
            $rounded = round($balance, 2);
            $formattedBalances[] = [
                'participant_id' => $id,
                'name' => $participantMap[$id]['name'],
                'balance' => $rounded,
                'payment_details' => $participantMap[$id]['payment_details']
            ];

            if ($rounded < -0.005) {
                $debtors[] = [
                    'id' => $id,
                    'amount' => abs($rounded)
                ];
            } elseif ($rounded > 0.005) {
                $creditors[] = [
                    'id' => $id,
                    'amount' => $rounded
                ];
            }
        }

        // Жадный алгоритм Min Cash Flow
        $transactions = [];

        // Сортировка по убыванию абсолютных величин
        usort($debtors, fn($a, $b) => $b['amount'] <=> $a['amount']);
        usort($creditors, fn($a, $b) => $b['amount'] <=> $a['amount']);

        $dIdx = 0;
        $cIdx = 0;

        while ($dIdx < count($debtors) && $cIdx < count($creditors)) {
            $debtor = &$debtors[$dIdx];
            $creditor = &$creditors[$cIdx];

            $settleAmount = round(min($debtor['amount'], $creditor['amount']), 2);

            if ($settleAmount > 0.005) {
                $debtorInfo = $participantMap[$debtor['id']];
                $creditorInfo = $participantMap[$creditor['id']];

                $transactions[] = [
                    'from' => $debtorInfo['name'],
                    'from_id' => $debtorInfo['id'],
                    'to' => $creditorInfo['name'],
                    'to_id' => $creditorInfo['id'],
                    'amount' => $settleAmount,
                    'to_payment_details' => $creditorInfo['payment_details']
                ];

                $debtor['amount'] = round($debtor['amount'] - $settleAmount, 2);
                $creditor['amount'] = round($creditor['amount'] - $settleAmount, 2);
            }

            if ($debtor['amount'] <= 0.005) {
                $dIdx++;
            }
            if ($creditor['amount'] <= 0.005) {
                $cIdx++;
            }
        }

        return [
            'transactions' => $transactions,
            'net_balances' => $formattedBalances,
            'total_spent' => round($totalSpent, 2)
        ];
    }
}
