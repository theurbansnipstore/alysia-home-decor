import type { ProductAttributeDTO } from "@/types";

export default function ProductSpecTable({ attributes }: { attributes: ProductAttributeDTO[] }) {
  if (!attributes || attributes.length === 0) return null;

  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-ink-100">
        {attributes.map((attr) => (
          <tr key={attr.id}>
            <th scope="row" className="w-1/3 py-2.5 text-left font-normal text-ink-500">
              {attr.label}
            </th>
            <td className="py-2.5 text-charcoal">{attr.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
