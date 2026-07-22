import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ParsedSMS } from '../../services/sms/smsParserService';
import { CheckCircle, XCircle } from 'lucide-react-native';

interface SmsDraftCardProps {
  draft: ParsedSMS & { id: string; status: string };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const SmsDraftCard: React.FC<SmsDraftCardProps> = ({ draft, onApprove, onReject }) => {
  return (
    <View className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-lg font-bold text-gray-900">
            {draft.parsedType === 'income' ? '+' : '-'}₹{draft.parsedAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '???'}
          </Text>
          <Text className="text-sm text-gray-500">
            {draft.parsedMerchant || draft.smsSender || 'Unknown Merchant'}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${
          draft.parseConfidence === 'HIGH' ? 'bg-green-100' :
          draft.parseConfidence === 'MEDIUM' ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <Text className={`text-xs font-bold ${
            draft.parseConfidence === 'HIGH' ? 'text-green-800' :
            draft.parseConfidence === 'MEDIUM' ? 'text-yellow-800' : 'text-red-800'
          }`}>
            {draft.parseConfidence} CONFIDENCE
          </Text>
        </View>
      </View>

      <View className="bg-gray-50 p-2 rounded-lg mb-3">
        <Text className="text-xs text-gray-600" numberOfLines={2}>
          "{draft.rawSmsText}"
        </Text>
      </View>

      <View className="flex-row justify-end gap-3">
        <TouchableOpacity 
          onPress={() => onReject(draft.id)}
          className="flex-row items-center gap-1 bg-red-50 px-4 py-2 rounded-xl"
        >
          <XCircle size={16} color="#ef4444" />
          <Text className="text-red-600 font-semibold">Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => onApprove(draft.id)}
          className="flex-row items-center gap-1 bg-green-50 px-4 py-2 rounded-xl"
        >
          <CheckCircle size={16} color="#22c55e" />
          <Text className="text-green-600 font-semibold">Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
