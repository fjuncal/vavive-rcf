"use client";

export type UnitMember = {
  id: string;
  name: string;
  photoUrl?: string | null;
};

const FALLBACK_PHOTO =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85";

function resolveList(
  members: UnitMember[] | undefined,
  fallbackName: string,
  fallbackPhoto?: string | null,
): UnitMember[] {
  if (members && members.length) return members;
  return [{ id: "legacy", name: fallbackName, photoUrl: fallbackPhoto }];
}

export function memberNamesLabel(
  members: UnitMember[] | undefined,
  fallbackName: string,
): { short: string; full: string } {
  const list = resolveList(members, fallbackName);
  const full = list.map((item) => item.name).join(", ");
  if (list.length === 1) return { short: list[0].name, full };
  if (list.length === 2)
    return { short: `${list[0].name} & ${list[1].name}`, full };
  return { short: `${list[0].name} +${list.length - 1}`, full };
}

/**
 * Nomes das pessoas da unidade: 1 pessoa ("João"),
 * 2 pessoas ("João & Maria"), 3+ ("João +2", com todos no title).
 * O truncamento/overflow é controlado pela classe do elemento pai.
 */
export function UnitNames({
  members,
  fallbackName,
  className,
}: {
  members?: UnitMember[];
  fallbackName: string;
  className?: string;
}) {
  const { short, full } = memberNamesLabel(members, fallbackName);
  return (
    <span title={full} className={className}>
      {short}
    </span>
  );
}

/**
 * Fotos das pessoas da unidade.
 * - layout "hero" (card principal): 1 foto grande igual à atual;
 *   2 fotos lado a lado; 3+ em grade compacta com selo "+N".
 * - layout "avatar" (demais superfícies): pilha sobreposta compacta.
 * Alturas sempre limitadas para não estourar o card.
 */
export function UnitPhotos({
  members,
  fallbackName,
  fallbackPhoto,
  layout,
  avatarClassName = "h-14 w-14",
}: {
  members?: UnitMember[];
  fallbackName: string;
  fallbackPhoto?: string | null;
  layout: "hero" | "avatar";
  avatarClassName?: string;
}) {
  const list = resolveList(members, fallbackName, fallbackPhoto);
  const srcOf = (item: UnitMember) => item.photoUrl || FALLBACK_PHOTO;

  if (layout === "hero") {
    if (list.length === 1) {
      return (
        <img
          src={srcOf(list[0])}
          alt={list[0].name}
          className="mx-auto aspect-[4/5] max-h-[min(54vh,580px)] w-full max-w-sm rounded-[28px] object-cover shadow-2xl"
        />
      );
    }
    if (list.length === 2) {
      return (
        <div className="grid min-w-0 grid-cols-2 gap-3">
          {list.map((item) => (
            <img
              key={item.id}
              src={srcOf(item)}
              alt={item.name}
              title={item.name}
              className="aspect-[3/4] max-h-[min(40vh,420px)] w-full rounded-[24px] object-cover shadow-2xl"
            />
          ))}
        </div>
      );
    }
    const shown = list.slice(0, 3);
    const extra = list.length - shown.length;
    return (
      <div className="grid min-w-0 grid-cols-3 gap-2">
        {shown.map((item, index) => (
          <div key={item.id} className="relative min-w-0">
            <img
              src={srcOf(item)}
              alt={item.name}
              title={list.map((m) => m.name).join(", ")}
              className="aspect-square max-h-[min(28vh,300px)] w-full rounded-[20px] object-cover shadow-2xl"
            />
            {extra > 0 && index === shown.length - 1 ? (
              <span className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-[#003b71]/70 text-3xl font-bold text-white">
                +{extra}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  return (
    <span
      className="flex shrink-0 items-center"
      title={list.map((item) => item.name).join(", ")}
    >
      {shown.map((item, index) => (
        <img
          key={item.id}
          src={srcOf(item)}
          alt={item.name}
          className={`${avatarClassName} rounded-2xl border-2 border-white/40 object-cover shadow-lg ${index > 0 ? "-ml-5" : ""}`}
        />
      ))}
      {extra > 0 ? (
        <span
          className={`${avatarClassName} -ml-5 flex items-center justify-center rounded-2xl bg-[#003b71] text-sm font-bold text-white shadow-lg`}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
