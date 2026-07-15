import { User } from "database";
import { AiUsageQuota } from "database";


async function getCurrentQuota(userId: number, model: string) {
    const user = await User.findOneBy({ id: userId });
    const quotas = user?.aiRestrictions?.filter(quota => quota.model === model && quota.output && quota.input && quota.timestamp + quota.time >= Date.now());
    const quota = quotas?.reduce((prev, current) => {
        return prev.output < current.output ? prev : current;
    }, quotas[0]);
    return quota;
};


async function renewal(userId: number, quota: AiUsageQuota) {
    const user = await User.findOneBy({ id: userId });
    user?.aiRestrictions?.push(quota);
    await user.save();
}

export { getCurrentQuota, renewal }